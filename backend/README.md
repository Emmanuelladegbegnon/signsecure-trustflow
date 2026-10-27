# SignSecure TrustFlow — Backend

API Node.js/Express/TypeScript implémentant les 33 endpoints d'[`API_CONTRACT.md`](../API_CONTRACT.md), dans le respect des règles de [`CLAUDE.md`](../CLAUDE.md).

## Stack

- **Express** + TypeScript (`NodeNext`, imports `.js`)
- **Prisma** + SQLite — aucune infra à installer pour développer
- **bcrypt** (mots de passe), **jsonwebtoken** (session), **zod** (validation des entrées)
- **multer** (upload PDF/photos), **pdf-lib** (embed de la signature dans le PDF final)
- **vitest** + **supertest** pour les tests

## Démarrage

```bash
npm install
cp .env.example .env   # puis générer un vrai JWT_SECRET : openssl rand -hex 32
npm run prisma:generate
npm run prisma:migrate  # crée dev.db
npm run seed             # organisation démo + compte Administrateur + profils de permissions
npm run dev               # http://localhost:4000
```

Compte administrateur créé par le seed : `admin@signsecure.demo` / `ChangeMe123!` (à changer en dehors d'un contexte de démonstration).

## Tests

```bash
npm test
```

Utilise une base SQLite dédiée (`prisma/test.db`, recréée à chaque run via `prisma db push`, jamais `dev.db`) et un `OtpProvider` de capture (`OTP_PROVIDER=test`, voir `src/lib/otpProvider.ts`) qui permet aux tests de lire le code envoyé sans jamais lire le hash stocké en base — le même point d'observation qu'aurait un vrai fournisseur SMS/email.

## Structure

```
src/
  app.ts               # app Express configurée (importable par les tests)
  index.ts              # point d'entrée (app.listen)
  env.ts, db.ts
  lib/                   # briques transverses (audit, jwt, otp, storage, erreurs, rôles...)
  middleware/            # auth, validation, gestion d'erreurs
  modules/
    documents/status.ts  # COUCHE MÉTIER PARTAGÉE — seule autorisée à écrire
                           # Document.statut / custodyStatus (CLAUDE.md)
    auth/ sign/ verify/ trace/ admin/
      schemas.ts   # validation zod
      service.ts   # logique métier
      routes.ts    # handlers Express (minces — délèguent tout à service.ts)
  test/                  # setup global des tests, factories
```

## Décisions et limites assumées (MVP)

- **Signature manuscrite** : jamais persistée — voir `lib/pendingSignatures.ts` (file d'attente en mémoire, consommée une seule fois) et `modules/sign/pdf.ts` (embed direct dans le PDF final).
- **Rôles** : l'énum Prisma est en identifiants sans accent (`SUPERVISEUR`...) ; `lib/roles.ts` fait le pont avec les libellés exacts attendus par le front (`Superviseur`...) aux deux frontières de l'API.
- **OTP/emails** : provider "console" par défaut — journalise côté serveur, aucun compte SMTP/SMS requis pour faire tourner le projet. Remplacer `ConsoleOtpProvider`/`sendEmail` par un vrai provider suffit à passer en prod.
- **Verify — comparaison Trace (`ocr_score`)** : API_CONTRACT.md demande un score de correspondance textuelle pour les dossiers Trace, ce qui suppose un moteur OCR. CLAUDE.md demande explicitement de s'arrêter avant d'ajouter une dépendance de ce type sans validation. En attendant cette décision, `modules/verify/service.ts` renvoie un score **placeholder explicitement documenté** (similarité de taille de fichier avec la première photo de référence) — jamais présenté comme un verdict d'identité. **À confirmer avec l'équipe avant mise en situation réelle.**
- **JWT sans état** : `POST /auth/logout` ne révoque pas le token côté serveur (pas de liste de révocation pour ce MVP) — la fenêtre d'exposition reste bornée par `JWT_EXPIRES_IN` (2h).
- **Détenteur physique (`custodyStatus`)** : `Document.currentHolderId` est mis à jour uniquement par la couche métier (`modules/documents/status.ts`), jamais directement par une route.
- **Étiquette Trace** : SVG généré à la volée (`modules/trace/label.ts`) plutôt qu'une dépendance de rendu image — ne contient que le code de suivi, déjà connu de l'appelant.
