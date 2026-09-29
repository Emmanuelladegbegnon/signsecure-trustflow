# API_CONTRACT.md — SignSecure TrustFlow

Ce document est le contrat d'API à respecter par le frontend (React + Vite) et le backend. Aucun mock : le front doit consommer ces endpoints réels dès le développement. Toute évolution de ce contrat doit être répercutée ici en premier, avant modification du code front ou back.

Se référer à CLAUDE.md pour les règles de sécurité, le vocabulaire autorisé, et les décisions produit qui encadrent l'implémentation de chacun de ces endpoints.

## Conventions générales

- Toutes les routes sauf `/api/verify/*`, `/api/auth/login`, `/api/auth/otp/*` et `/api/sign/link/*` exigent un token d'authentification (header `Authorization: Bearer <token>`).
- Toute erreur suit le format : `{ "error": { "code": "STRING_CODE", "message": "texte lisible" } }`.
- Les champs `document_status` et `custody_status` ne sont jamais modifiables directement par le client : uniquement via les endpoints d'action dédiés, qui passent par la couche métier centralisée du backend.
- Toutes les dates sont en ISO-8601, calculées et renvoyées côté serveur.
- Rate limiting obligatoire sur tous les endpoints sous `/api/verify/*` (risque d'énumération, accès public sans compte), ainsi que sous `/api/sign/link/*`.
- Session : le token référence une session serveur. Après `SESSION_IDLE_MINUTES` (15 min par défaut) sans requête, toute route protégée répond 401 `SESSION_IDLE_TIMEOUT` ; `POST /api/auth/logout` révoque la session (le token devient inutilisable).
- Codes de suivi : format `SGN-XXXXXXXX-C` / `TRC-XXXXXXXX-C`, où `C` est un caractère de contrôle (Luhn mod 32, algorithme public). Les codes émis avant son introduction (sans `-C`) restent acceptés.
- Fichiers : stockés chiffrés au repos (AES-256-GCM) et servis uniquement par les endpoints authentifiés décrits ci-dessous.

---

## 1. AUTH

Note : il n'y a pas d'inscription libre (self-service). Un compte est toujours créé par un administrateur (voir module 5, POST /api/admin/users), qui déclenche un email d'invitation. Les deux endpoints ci-dessous gèrent l'activation de ce compte invité, avant le premier login classique.

### GET /api/auth/invitation/:token
Entrée : token dans l'URL (reçu par email)
Sortie (200) : `{ nom, prenom, email }` — pour préremplir l'écran de définition de mot de passe
Sortie (410) : invitation expirée ou déjà utilisée

### POST /api/auth/invitation/:token/activer
Entrée : `{ password }`
Sortie (200) : `{ success: true }` — le compte passe de "invité" à "actif" ; l'utilisateur peut ensuite utiliser /api/auth/login normalement

### POST /api/auth/login
Entrée : `{ email, password }`
Sortie (200) : `{ requiresOtp: true, otpChannel: "sms" | "email" }`
Sortie (401) : erreur standard

### POST /api/auth/otp/verify
Entrée : `{ email, code }`
Sortie (200) : `{ token, user: { id, nom, prenom, roles: string[] } }`

### POST /api/auth/otp/resend
Entrée : `{ email }`
Sortie (200) : `{ success: true, nextResendAt: ISODate }`

### POST /api/auth/logout
Entrée : aucune (token en header)
Sortie (200) : `{ success: true }`

### GET /api/auth/me
Entrée : aucune (token en header)
Sortie (200) : `{ id, nom, prenom, email, telephone, roles: string[] }`

---

## 2. SIGN

### POST /api/documents
Entrée : `multipart/form-data` — fichier PDF, `titre`, `type`, `sensible?` (`"true"`/`"false"`, défaut false)
Sortie (201) : `{ dossierId, trackingCode }`
Effet serveur : calcule le SHA-256 et le nombre de pages du PDF déposé. Un document `sensible` exige deux codes à la signature (SMS + email).
Erreur : 400 `INVALID_PDF`

### POST /api/documents/:id/signataires
Entrée : `{ signataires: [{ nom, email, telephone, zone: { page, x, y } }] }`
Sortie (200) : `{ success: true, transactionsCreated: string[] }`
Erreurs (400) : `INVALID_PHONE` (numéro non joignable par SMS), `SIGNER_IS_ISSUER` (email ou téléphone de l'émetteur — utiliser signer-maintenant), `DUPLICATE_SIGNER`.

### POST /api/documents/:id/envoyer
Entrée : aucune
Sortie (200) : `{ success: true }` — déclenche l'envoi des liens de signature par email. Une relance automatique est envoyée une fois, quand il reste moins de `SIGNER_REMINDER_HOURS_BEFORE_EXPIRY` heures.

### POST /api/documents/:id/signer-maintenant
Entrée : `{ zone: { page, x, y } }`
Sortie (200) : `{ token }` — signature du compte authentifié lui-même (sans passer par l'email) : nom/email/téléphone viennent du compte en base, pas du corps de la requête. Le front enchaîne directement sur GET /api/sign/link/:token, comme pour un signataire externe. N'envoie aucun email ; n'affecte pas les autres signataires du dossier.

### GET /api/sign/link/:token
Entrée : token dans l'URL
Sortie (200) : `{ dossier: { titre, type, page }, pdfUrl, zoneSignature: { page, x, y }, otp: { canaux: [{ canal: "sms" | "email", destination }], smsSimulation: boolean } }` — `destination` est masquée
Sortie (410) : lien expiré ou déjà utilisé

### POST /api/sign/link/:token/signature
Entrée : `{ signatureImageBase64, consentement: true }`
Sortie (200) : `{ otpRequired: true, canaux: [{ canal, destination }], smsSimulation: boolean }`
Effet serveur : enregistre l'horodatage du consentement, l'IP et le navigateur ; envoie un code par SMS (canal distinct de l'email qui a reçu le lien), plus un code par email si le document est sensible.
Note sécurité : l'image de signature n'est jamais persistée en base ; elle transite en mémoire jusqu'à l'étape OTP suivante.

### POST /api/sign/link/:token/otp/resend
Entrée : aucune
Sortie (200) : `{ success: true, canaux, nextResendAt }` — invalide les codes précédents
Erreurs : 409 `RESEND_TOO_SOON`, 409 `TOO_MANY_CODES` (5 codes maximum par lien), 410 si le dessin a expiré

### POST /api/sign/link/:token/otp/verify
Entrée : `{ code, codeEmail? }` — `code` = code SMS ; `codeEmail` exigé pour un document sensible
Sortie (200) : `{ success: true, dossierId, trackingCode }`
Effet serveur : crée une NOUVELLE version du PDF avec la signature intégrée (et son paraphe en réduction sur chaque autre page) (la précédente n'est jamais modifiée) et détruit toute donnée temporaire de signature. Au dernier signataire : ajoute le pied de page de vérification (un QR propre à chaque page avec jeton de page, code, domaine officiel, page x/N), appose le cachet PAdES de plateforme (auto-signé, démonstration, non qualifié), calcule le hash SHA-256 de référence côté serveur, et demande un horodatage RFC 3161 si `TSA_URL` est configurée.

### GET /api/documents/:id/fichier
Entrée : aucune — endpoint authentifié, dossier vérifié dans l'organisation de l'appelant
Sortie (200) : flux binaire `application/pdf` — version finale signée (`finalPdfPath`) si elle existe, sinon le PDF d'origine déposé
Erreur : 404 si le dossier n'existe pas dans cette organisation, ou si aucun fichier n'a encore été déposé
Note : seul moyen d'accéder au PDF depuis le back-office — jamais de chemin de stockage exposé au client (CLAUDE.md § Sécurité). Utilisé pour la prévisualisation dans Mes dossiers / Rapport de preuve.

### GET /api/documents/:id/rapport-preuve
Entrée : aucune (token, permissions vérifiées)
Sortie (200) : rapport en 5 blocs —
`{ titre, codeReference, statut,
  expediteur: { nom, organisation, dateCreation, dateEnvoi },
  signataires: [{ nom, email, telephone (masqué), identite, signe, methode,
                  authentification: { lienUnique, canauxOtp: ["sms", "email"?] },
                  contexte: { ip, userAgent },
                  dates: { consentement, validation } }],
  empreinte: { sha256Final, sha256Original, nombrePages, cachet: { date, nature, empreinteCertificat, conformeAuCertificatPublie } | null, horodatageTiers: { date, service } | null },
  journal: { chaineIntacte },
  timeline: [...], hash, disclaimer }`
`identite` indique toujours que l'identité est déclarée par l'émetteur, non vérifiée.

### GET /api/documents/:id/horodatage
Entrée : aucune (authentifié)
Sortie (200) : jeton RFC 3161 (`application/timestamp-reply`, fichier .tsr) — vérifiable hors SignSecure : `openssl ts -verify -in jeton.tsr -data document.pdf -CAfile ca-du-tsa.pem`
Erreur : 404 si aucun horodatage tiers n'a été obtenu

### POST /api/documents/:id/revoquer
Entrée : `{ motif }` — rôle Superviseur requis
Sortie (200) : `{ success: true }`

### GET /api/documents
Entrée : query params `statut`, `type`, `date`, `q` (recherche dans intitulé, code, référence, organisme, nom ou email d'un signataire), `pages` (nombre de pages)
Sortie (200) : `{ dossiers: [{ id, trackingCode, titre, statut, origine, date }] }`

---

## 3. VERIFY (public, sans authentification)

### GET /api/verify/:code
Entrée : code de suivi dans l'URL
Sortie (200, origine SIGN) : `{ statut, origine: "SIGN", integrite: { methode: "hash_exact", hashDisponible, hash, nombrePages, cachetPlateforme, empreinteCertificatCachet, horodatageTiers, apercuParPage }, signature: { type, titre, dateScellement }, revocation? }`
Sortie (200, caractère de contrôle faux) : `{ statut: "UNKNOWN_CODE", controle: "CARACTERE_DE_CONTROLE_INVALIDE" }`
Sortie (200, origine TRACE) : `{ statut, origine: "TRACE", integrite: { methode: "examen_humain" }, tracabilite: { reference, nombrePages, dateEnregistrement, incidentEnCours } }`
Sortie (200, code introuvable) : `{ statut: "UNKNOWN_CODE" }` — jamais 404, pour éviter l'énumération par timing

### GET /api/verify/:code/pages/:page?k=<jeton>
Entrée : numéro de page et jeton imprimés dans le QR de cette page (HMAC lié au code et à la page)
Sortie (200) : `application/pdf` d'une seule page — aperçu filigrané « ne vaut pas original » de la page telle que scellée ; en-tête `X-Nombre-Pages`
Erreur : 400 `INVALID_PAGE_LINK` (réponse identique pour un code inconnu, une page hors document ou un jeton invalide)
But : comparer une feuille imprimée à la page scellée correspondante ; un QR recopié d'une vraie page fait apparaître la vraie page.

### POST /api/verify/recherche-par-fichier
Entrée : `multipart/form-data` — `fichier` (PDF, gardé en mémoire)
Sortie (200) : `{ trouve: true, trackingCode, statut, hashSoumis }` | `{ trouve: false, hashSoumis }`
But : retrouver un document dont le code imprimé est illisible ou douteux. Correspondance exacte d'empreinte avec une version finale ; ne fonctionne pas sur un scan.

### GET /api/verify/cachet/certificat
Sortie (200) : `{ empreinteSha256, sujet, valideJusquau, nature }` — empreinte du certificat de cachet en service, publiée pour détecter un changement de clé

### POST /api/verify/:code/comparer
Entrée : `multipart/form-data` — fichier soumis par le tiers (gardé en mémoire, jamais écrit sur disque)
Sortie (200, origine SIGN) : `{ methode: "hash_exact", resultat: "correspond" | "diverge", hashSoumis, hashReference }`
Sortie (200, origine TRACE) : `{ methode: "examen_humain", message }` — aucun score ni verdict automatique
Erreur : 409 `NO_FINAL_VERSION` si le document Sign n'a pas encore de version finale
Règle (décision du 2026-09-29, option A) : `hash_exact` uniquement pour un dossier Sign. Une photo/scan Trace n'est jamais comparée automatiquement : la comparaison est un examen humain interne (voir POST /api/trace/:id/comparaisons).

---

## 4. TRACE

### POST /api/trace/enregistrement
Entrée : `{ type, titre, reference, organismeDeclare, dateIndiquee, nombrePages, confidentialite, lieuReception }`
Sortie (201) : `{ dossierId }` (statut brouillon, avant validation superviseur)

### POST /api/trace/:id/observations
Entrée : `{ signaturePresente, pagesCompletes, cachetVisible, documentLisible, enveloppeIntacte, anomalie?: string }`
Sortie (200) : `{ success: true }`

### POST /api/trace/:id/capture
Entrée : `multipart/form-data` — photos[] (JPEG/PNG/WebP ; le front n'autorise que la caméra)
Sortie (200) : `{ artifactId, pageCount, empreintes: [{ page, sha256 }] }`
Effet serveur : SHA-256 de chaque photo calculé à la réception et inscrit au journal chaîné (`TRACE_PHOTO_CAPTURED`). Refusé (409) après validation.

### POST /api/trace/:id/valider
Entrée : aucune — rôle Superviseur requis
Sortie (200) : `{ success: true, trackingCode, etiquetteUrl }`
Effet serveur : génère le code de suivi aléatoire, crée l'événement `RECEIVED`.
Erreur : 400 `PAGES_MISSING_PHOTOS` s'il y a moins de photos que de pages déclarées.

### POST /api/trace/:id/transfert
Entrée : `{ destinataireId, lieu, motif }`
Sortie (201) : `{ transfertId, statut: "PENDING" }`

### POST /api/trace/transfert/:transfertId/confirmer
Entrée : aucune (destinataire authentifié)
Sortie (200) : `{ success: true }` — change le détenteur actuel (`custody_status`)

### POST /api/trace/:id/incident
Entrée : `{ type, description, photo? }`
Sortie (201) : `{ incidentId, statut: "INCIDENT_OPEN" }`

### GET /api/trace/:id/timeline
Entrée : aucune
Sortie (200) : `{ evenements: [{ type, acteur, date, details }] }`

### GET /api/trace/:id/photos
Entrée : aucune
Sortie (200) : `{ photos: [{ id, pageIndex, url, sha256, dateCapture }] }` — `url` pointe vers GET /api/trace/photos/:artifactId

### GET /api/trace/photos/:artifactId
Entrée : aucune — endpoint authentifié, photo vérifiée dans l'organisation de l'appelant
Sortie (200) : flux binaire de la photo/scan de référence capturée à la réception
Erreur : 404 si la photo n'existe pas dans cette organisation
Note : jamais d'accès direct au chemin de stockage (CLAUDE.md § Sécurité). Utilisé pour la prévisualisation dans la Chaîne de garde.

### POST /api/trace/:id/comparaisons
Entrée : `multipart/form-data` — `fichier` (copie présentée : image ou PDF), `conclusion` (`CONCORDANCE_CONSTATEE` | `DIVERGENCES_CONSTATEES` | `EXAMEN_NON_CONCLUANT`), `commentaire` — rôle Vérificateur ou Superviseur
Sortie (201) : `{ comparaisonId, conclusion, date }`
Effet serveur : examen humain horodaté côté serveur, empreinte de la copie inscrite au journal (`TRACE_COMPARISON_RECORDED`).

### GET /api/trace/:id/comparaisons
Sortie (200) : `{ comparaisons: [{ id, conclusion, commentaire, examinateur, date, sha256CopieExaminee, url, mimeType }] }`

### GET /api/trace/comparaisons/:comparaisonId/fichier
Sortie (200) : flux binaire de la copie examinée (authentifié, même organisation)

### POST /api/trace/:id/archiver
Entrée : aucune
Sortie (200) : `{ success: true }`

---

## 5. ADMIN

### GET /api/admin/users
Sortie (200) : `{ users: [{ id, nom, prenom, email, roles: string[], statut: "invite" | "actif" | "suspendu" }] }`

### POST /api/admin/users
Entrée : `{ nom, prenom, email, telephone, roles: string[] }`
Sortie (201) : `{ userId }` — déclenche l'envoi d'un email d'invitation

### POST /api/admin/users/bulk
Entrée : `{ users: [{ nom, prenom, email, telephone, roles: string[] }] }`
Sortie (201) : `{ created: [{ userId, email }], errors: [{ email, reason }] }`
Note : traite chaque ligne indépendamment — un email invalide ou déjà existant ne doit pas bloquer la création des autres comptes de la liste. Déclenche un email d'invitation pour chaque compte créé avec succès.

### GET /api/admin/roles/profils
Sortie (200) : `{ profils: [{ id, nom, description, permissions: string[] }] }`
Note : profils prédéfinis (ex. "Signataire standard", "Agent de réception", "Superviseur") pour accélérer la création de compte — l'admin sélectionne un profil plutôt que de cocher chaque permission individuellement. Reste modifiable ensuite via PATCH /api/admin/users/:id/roles.

### PATCH /api/admin/users/:id/statut
Entrée : `{ statut: "actif" | "suspendu" }` — rôle Administrateur requis
Sortie (200) : `{ success: true }`
Règle : transition uniquement `actif → suspendu` ou `suspendu → actif` (jamais depuis/vers "invite" par cet endpoint) ; un administrateur ne peut pas modifier le statut de son propre compte.
Effet serveur : un compte suspendu perd l'accès immédiatement (requireAuth revérifie le statut en base à chaque requête, pas seulement à l'émission du token).

### DELETE /api/admin/users/:id
Entrée : aucune — rôle Administrateur requis
Sortie (200) : `{ success: true }`
Règle : autorisé uniquement si le compte est encore au statut "invite" (invitation jamais activée). Un compte "actif" ou "suspendu" ne se supprime jamais — utiliser PATCH .../statut pour le suspendre, afin de ne jamais perdre la traçabilité d'actions réellement effectuées.

### PATCH /api/admin/users/:id/roles
Entrée : `{ roles: string[] }`
Sortie (200) : `{ success: true }`

### GET /api/admin/audit
Entrée : query params `acteur`, `action`, `date`
Sortie (200) : `{ evenements: [{ actorId, action, objectType, objectId, timestampServer, ip, hash }] }`

### GET /api/admin/audit/integrite
Entrée : aucune — rôle Administrateur ou Vérificateur
Sortie (200) : `{ chaineIntacte, ruptureEvenementId, ancrages: [{ id, date, lastEventHash, nombreEvenements, chaineIntacte, destinataires, horodatageTiers }] }`

### POST /api/admin/audit/controle-ancrage
Entrée : `{ hash }` (64 hex, tiré d'un email d'ancrage) — rôle Administrateur, Vérificateur ou Superviseur
Sortie (200) : `{ trouve: true, evenementId, date, position, nombreEvenements, chaineIntacteJusquIci, ancrageEnregistre, conclusion }` | `{ trouve: false, conclusion }`
But : détecter une réécriture du journal (hash reçu autrefois mais absent aujourd'hui).

### POST /api/admin/audit/ancrage
Entrée : aucune — rôle Administrateur
Sortie (201) : `{ ancrageId, lastEventHash, destinataires, date }`
Effet serveur : envoie le dernier hash du journal par email aux superviseurs et administrateurs actifs (et le fait horodater si `TSA_URL` est configurée). Aussi exécuté automatiquement toutes les `AUDIT_ANCHOR_INTERVAL_HOURS` heures.

---

## Ordre de développement suggéré

1. Auth (tout dépend de ça)
2. Sign (module le plus complet, valide toute la chaîne hash/audit)
3. Verify (consomme les dossiers créés par Sign — peut être testé dès que Sign fonctionne)
4. Trace (module indépendant, peut être développé en parallèle de Verify)
5. Admin (dernier, car dépend surtout de données déjà créées via les autres modules)
