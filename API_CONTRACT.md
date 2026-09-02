# API_CONTRACT.md — SignSecure TrustFlow

Ce document est le contrat d'API à respecter par le frontend (React + Vite) et le backend. Aucun mock : le front doit consommer ces endpoints réels dès le développement. Toute évolution de ce contrat doit être répercutée ici en premier, avant modification du code front ou back.

Se référer à CLAUDE.md pour les règles de sécurité, le vocabulaire autorisé, et les décisions produit qui encadrent l'implémentation de chacun de ces endpoints.

## Conventions générales

- Toutes les routes sauf `/api/verify/*`, `/api/auth/login`, `/api/auth/otp/*` et `/api/sign/link/*` exigent un token d'authentification (header `Authorization: Bearer <token>`).
- Toute erreur suit le format : `{ "error": { "code": "STRING_CODE", "message": "texte lisible" } }`.
- Les champs `document_status` et `custody_status` ne sont jamais modifiables directement par le client : uniquement via les endpoints d'action dédiés, qui passent par la couche métier centralisée du backend.
- Toutes les dates sont en ISO-8601, calculées et renvoyées côté serveur.
- Rate limiting obligatoire sur tous les endpoints sous `/api/verify/*` (risque d'énumération, accès public sans compte).

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
Sortie (200) : `{ id, nom, prenom, email, roles: string[] }`

---

## 2. SIGN

### POST /api/documents
Entrée : `multipart/form-data` — fichier PDF, `titre`, `type`
Sortie (201) : `{ dossierId, trackingCode }`

### POST /api/documents/:id/signataires
Entrée : `{ signataires: [{ nom, email, telephone, zone: { page, x, y } }] }`
Sortie (200) : `{ success: true, transactionsCreated: string[] }`

### POST /api/documents/:id/envoyer
Entrée : aucune
Sortie (200) : `{ success: true }` — déclenche l'envoi des liens de signature par email

### GET /api/sign/link/:token
Entrée : token dans l'URL
Sortie (200) : `{ dossier: { titre, type, page }, pdfUrl, zoneSignature: { page, x, y } }`
Sortie (410) : lien expiré ou déjà utilisé

### POST /api/sign/link/:token/signature
Entrée : `{ signatureImageBase64, consentement: true }`
Sortie (200) : `{ otpRequired: true }`
Note sécurité : l'image de signature n'est jamais persistée en base ; elle transite en mémoire jusqu'à l'étape OTP suivante.

### POST /api/sign/link/:token/otp/verify
Entrée : `{ code }`
Sortie (200) : `{ success: true, dossierId, trackingCode }`
Effet serveur : génère le PDF final avec la signature intégrée, calcule le hash SHA-256 côté serveur, détruit toute donnée temporaire de signature, verrouille le document.

### GET /api/documents/:id/rapport-preuve
Entrée : aucune (token, permissions vérifiées)
Sortie (200) : `{ signataires: [...], timeline: [...], hash, disclaimer: string }`

### POST /api/documents/:id/revoquer
Entrée : `{ motif }` — rôle Superviseur requis
Sortie (200) : `{ success: true }`

### GET /api/documents
Entrée : query params `statut`, `type`, `date`
Sortie (200) : `{ dossiers: [{ id, trackingCode, titre, statut, origine, date }] }`

---

## 3. VERIFY (public, sans authentification)

### GET /api/verify/:code
Entrée : code de suivi dans l'URL
Sortie (200) : `{ statut, origine, integrite, signature, tracabilite, revocation }`
Sortie (200, code introuvable) : `{ statut: "UNKNOWN_CODE" }` — jamais 404, pour éviter l'énumération par timing

### POST /api/verify/:code/comparer
Entrée : `multipart/form-data` — fichier soumis par le tiers
Sortie (200) : `{ methode: "hash_exact" | "ocr_score", resultat: "correspond" | "diverge", score?: number }`
Règle : `hash_exact` uniquement si le dossier provient de Sign ; `ocr_score` obligatoire si le dossier provient de Trace — jamais de hash exact sur une photo/scan.

---

## 4. TRACE

### POST /api/trace/enregistrement
Entrée : `{ type, titre, reference, organismeDeclare, dateIndiquee, nombrePages, confidentialite, lieuReception }`
Sortie (201) : `{ dossierId }` (statut brouillon, avant validation superviseur)

### POST /api/trace/:id/observations
Entrée : `{ signaturePresente, pagesCompletes, cachetVisible, documentLisible, enveloppeIntacte, anomalie?: string }`
Sortie (200) : `{ success: true }`

### POST /api/trace/:id/capture
Entrée : `multipart/form-data` — photos[]
Sortie (200) : `{ artifactId, pageCount }`

### POST /api/trace/:id/valider
Entrée : aucune — rôle Superviseur requis
Sortie (200) : `{ success: true, trackingCode, etiquetteUrl }`
Effet serveur : génère le code de suivi aléatoire, crée l'événement `RECEIVED`.

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

### PATCH /api/admin/users/:id/roles
Entrée : `{ roles: string[] }`
Sortie (200) : `{ success: true }`

### GET /api/admin/audit
Entrée : query params `acteur`, `action`, `date`
Sortie (200) : `{ evenements: [{ actorId, action, objectType, objectId, timestampServer, ip, hash }] }`

---

## Ordre de développement suggéré

1. Auth (tout dépend de ça)
2. Sign (module le plus complet, valide toute la chaîne hash/audit)
3. Verify (consomme les dossiers créés par Sign — peut être testé dès que Sign fonctionne)
4. Trace (module indépendant, peut être développé en parallèle de Verify)
5. Admin (dernier, car dépend surtout de données déjà créées via les autres modules)
