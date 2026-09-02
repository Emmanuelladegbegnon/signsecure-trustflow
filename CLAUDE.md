# TrustFlow

Ce fichier cadre le travail de Claude Code sur ce projet. Le lire entièrement avant toute modification de code. En cas de doute entre une idée « impressionnante » et une idée « conforme à ce document », toujours choisir la conformité à ce document.

## Contexte du projet

SignSecure TrustFlow est un MVP de soutenance (projet étudiant), pas un produit en production. C'est une plateforme de confiance documentaire à trois modules :

- **Sign** — signature électronique de documents PDF, avec signature manuscrite dessinée/importée, verrouillée par un parcours sécurisé.
- **Verify** — vérification publique (sans compte) d'un document via un code de suivi ou un QR code.
- **Trace** — enregistrement et suivi de documents physiques déjà signés hors SignSecure, pour constituer un dossier de preuve en cas de litige.

Le positionnement produit : SignSecure ne prétend JAMAIS être une autorité de certification, un prestataire de signature électronique qualifiée, ni un système d'identité vérifiée (pas d'eKYC réel). C'est un prototype démonstratif qui doit rester honnête sur ses limites à chaque étape du code (messages, noms de statuts, commentaires).

## Ce qui est explicitement EXCLU du MVP — ne jamais coder ni suggérer

- Biométrie (WebAuthn, empreinte, reconnaissance faciale) comme méthode d'authentification ou de confirmation de signature. Décision actée : on reste sur OTP (SMS/email).
- Connexion réelle à l'ANIP, la DGI, le RCCM, un HSM national ou une autorité de certification réelle. Toute intégration de ce type doit être une sandbox explicitement labellisée comme simulation.
- Signature électronique qualifiée, reconnaissance CEDEAO, authentification biométrique automatique de l'écriture manuscrite, géolocalisation continue.
- IA de détection de fraude, analyse d'écriture manuscrite par IA, ou toute fonctionnalité « intelligente » non explicitement demandée. Si une fonctionnalité semble nécessiter du machine learning, s'arrêter et demander confirmation avant d'implémenter quoi que ce soit dans cette direction.
- Blockchain. Le journal d'audit chaîné par hash (voir plus bas) remplit le même rôle de détection de falsification sans cette complexité.
- Stockage de la signature manuscrite (image du dessin) en base de données ou dans un cache, même chiffré. Voir section « Signature — règle stricte » ci-dessous.
- Tout vocabulaire suggérant une garantie absolue : ne jamais utiliser « authentifié », « certifié », « garanti », « non-répudiation garantie », « identique » dans un message utilisateur, un nom de variable, un commentaire de code ou une réponse d'API — utiliser à la place « enregistré », « conforme aux contrôles effectués », « correspondance selon le mode de comparaison utilisé ».

## Décisions actées sur le parcours de signature (Sign)

- Le signataire ne crée pas nécessairement de compte préalable. Il reçoit un email avec un lien unique, à usage unique, expirant après 48h, qui mène directement à l'écran de signature (le pad de dessin). Ce lien est un token signé côté serveur (JWT ou équivalent), lié à une transaction de signature précise — jamais un lien générique réutilisable pour plusieurs documents.
- Sur l'écran de signature : le signataire dessine sa signature sur un canvas, doit cocher une case de confirmation explicite (jamais pré-cochée) avant de pouvoir valider.
- Après confirmation, un second OTP (SMS ou email, distinct de toute connexion précédente) est exigé juste avant la validation finale de la signature — pas seulement à l'ouverture du lien.
- **Règle stricte sur la signature manuscrite (Option A retenue)** : l'image de la signature dessinée n'est JAMAIS stockée séparément en base de données, ni en cache serveur au-delà du traitement immédiat. Elle est directement intégrée (embed) dans le PDF final au moment de la génération de la version signée, puis toute donnée temporaire du canvas est détruite côté serveur immédiatement après génération. Ne jamais créer de table, colonne, ou fichier destiné à stocker durablement une image de signature brute.
- Le hash (SHA-256) de la version finale est TOUJOURS calculé côté serveur, jamais transmis depuis le client, jamais modifiable par une requête API.
- Toute modification d'un document déjà signé doit créer une nouvelle version — jamais une édition en place de la version signée.

## Décisions actées sur Verify

- Distinguer strictement deux niveaux de comparaison selon l'origine du document :
  - Document né dans Sign (PDF numérique) → comparaison de hash EXACTE possible et fiable à 100%.
  - Document enregistré via Trace (photo/scan) → JAMAIS de comparaison de hash exact. Utiliser une comparaison textuelle (OCR) avec un score de correspondance affiché explicitement (ex. « correspondance textuelle : 96% »), jamais un verdict binaire « identique/différent ».
- Un code de suivi inexistant doit renvoyer une réponse générique et neutre (`UNKNOWN_CODE`), sans détail permettant l'énumération. Rate limiting obligatoire sur l'endpoint de vérification publique.
- Les codes de suivi sont toujours générés aléatoirement côté serveur, jamais séquentiels, jamais dérivés du nom du signataire ou d'un identifiant prévisible.
- La page/réponse publique de Verify n'expose jamais : nom complet d'une personne autre que ce qui est strictement nécessaire, adresse ou lieu précis, commentaires internes, détails d'incident. Uniquement : code, statut, type de parcours, dates, résultat des contrôles.

## Décisions actées sur Trace

- Trace est recentré sur la constitution de preuve en cas de litige, pas sur le suivi logistique pur. La priorité de développement va à : capture de la référence à la réception (photo + métadonnées + horodatage serveur), génération du code de suivi, et à la solidité du dossier de preuve — pas à la richesse des événements de circulation interne (transferts, consultations), qui restent secondaires et peuvent être simplifiés en MVP si le temps manque.
- Chaque enregistrement Trace doit produire, dès la réception, un ensemble d'éléments concordants : horodatage serveur (jamais client), photo/scan de référence, identité du compte déclarant, métadonnées déclarées (type, référence, nombre de pages). Le code doit permettre de facilement rassembler ces éléments dans un même rapport consultable.
- Le champ `document_status` et le champ `custody_status` restent deux champs distincts (jamais fusionnés) — un document peut être `SIGNED` et `TRANSFER_PENDING` simultanément.
- Tout incident déclaré (perte, dommage, page manquante) doit être visible dans l'audit interne complet, mais seulement signalé de façon minimale (« incident en cours ») sur toute réponse publique via Verify.

## Sécurité et journal d'audit — exigences transversales

- Authentification à deux facteurs obligatoire pour tout compte interne (mot de passe + OTP). Session expirée après une courte inactivité pour toute action sensible.
- Verrouillage de compte après un nombre limité de tentatives de connexion échouées, avec entrée d'audit associée.
- Chaque action sensible (création, signature, validation, transfert, vérification, incident, révocation) génère un événement d'audit distinct et horodaté côté serveur, incluant : `actor_id`, `action`, `object_type`, `object_id`, `timestamp_server`, `ip_or_session_reference`.
- Le journal d'audit est chaîné : chaque événement inclut le hash de l'événement précédent (`previous_event_hash`, `event_hash`), pour rendre détectable toute altération a posteriori du journal.
- Isolation stricte des données par organisation (`organization_id`) : un utilisateur d'une organisation ne doit jamais pouvoir accéder, même par une URL devinée, aux fichiers ou dossiers d'une autre organisation.
- Aucun fichier (PDF, scan, photo) n'est accessible par URL directe sans contrôle d'accès serveur — toujours passer par un endpoint authentifié et autorisé, jamais par un chemin de stockage public devinable.

## Modèle de rôles (RBAC)

Chaque compte appartient à une personne réelle (nom, prénom, email, téléphone) et se voit attribuer un ou plusieurs rôles par un administrateur, à la manière d'un ERP classique — jamais de sélection de rôle par l'utilisateur lui-même après connexion.

Rôles : Agent de réception, Signataire, Superviseur, Vérificateur, Administrateur.

Toujours vérifier les permissions côté serveur avant chaque action, jamais se fier à un rôle affiché côté client.

## Ce que Claude Code doit faire avant de coder le backend

- Lire la structure du front déjà généré (composants, types TypeScript, appels API mockés ou attendus) pour aligner les endpoints du backend sur ce que le front attend réellement — plutôt que de redéfinir un contrat d'API indépendamment.
- Si le front attend une donnée ou un comportement qui contredit une règle de ce document (ex. stockage de signature en dur, comparaison de hash exact sur une photo), signaler explicitement la contradiction avant de coder, plutôt que de trancher silencieusement dans un sens ou dans l'autre.
- Proposer une structure de projet backend claire séparant les modules `auth`, `sign`, `verify`, `trace`, `audit`, `documents`, avec les transitions de statut centralisées dans une couche métier partagée — jamais de modification directe des champs de statut depuis un endpoint sans passer par cette couche.

## Ton et communication attendus de l'agent

- Ne jamais présenter une fonctionnalité comme juridiquement qualifiée, certifiée, ou garantie à 100% dans un commentaire, un message de commit, ou une suggestion — toujours utiliser un vocabulaire prudent conforme à la section « vocabulaire » ci-dessus.
- En cas d'ambiguïté entre plusieurs façons d'implémenter une règle de sécurité, choisir systématiquement l'option la plus simple et la plus robuste pour un MVP de démonstration plutôt que la plus sophistiquée techniquement.
