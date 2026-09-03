# SignSecure TrustFlow — Front-end

SPA React + Vite + TypeScript + Tailwind, branchée sur l'API décrite dans `../API_CONTRACT.md`. Les 5 modules du contrat (Auth, Sign, Verify, Trace, Admin — 33 endpoints) sont intégrés avec de vrais appels réseau, formulaires validés, états de chargement/erreur. Voir `../CLAUDE.md` pour les règles produit et sécurité qui encadrent le code.

## Démarrer

```bash
npm install
cp .env.example .env.local   # ajuster VITE_API_BASE_URL vers votre back local
npm run dev         # http://localhost:5173
npm run build        # build de prod dans dist/ (tsc -b && vite build)
npm run preview       # sert le build de prod localement
npm run lint            # oxlint
npm run test              # vitest run — suite unitaire/composants
npm run test:watch         # vitest en mode watch
```

Sans backend qui tourne, l'app se charge et navigue normalement ; les écrans qui dépendent d'un appel réseau (listes, détails) afficheront l'état d'erreur réseau plutôt qu'un contenu simulé — c'est voulu, voir CLAUDE.md.

## Structure

```
src/
  routes.ts                 # Table centrale de toutes les routes + helpers d'URL (ex: proofReportUrl(id))
  App.tsx                   # Déclaration des <Route>, routes publiques vs protégées (auth/ProtectedRoute)
  roles.ts                  # Référentiel unique des 5 rôles RBAC (CLAUDE.md)
  constants/                # Énumérations dont le contrat ne fixe pas les valeurs (types de document, etc.)
  lib/
    httpClient.ts            # Client fetch centralisé : base URL, token, erreurs { code, message }
  auth/
    AuthContext.tsx           # État d'auth réel (login, OTP, logout, restauration de session)
    ProtectedRoute.tsx          # Garde-fou côté client sur les routes qui exigent une session
  components/
    layout/                     # Sidebar/header/bottom-nav partagés (AppShell), shells publics
    ui/                           # Icon, StatusChip, FormAlert, OtpInputGroup, FullscreenSpinner
  pages/
    auth/            Connexion, OTP, activation de compte
    dashboard/        Tableau de bord (partiellement mock — pas d'endpoint dédié), Mes dossiers
    signature/         Upload → Signataires → SignerInvite (lien externe) → Rapport de preuve
    verification/       Recherche publique, résultat (hash exact / score OCR), comparaison de fichier
    traceability/         Liste et détail (chaîne de garde) des documents Trace
    mobile/                 Enregistrement physique, capture photo, observations, transfert, incident
    admin/                    Utilisateurs (+ import en masse), profils de permissions, journal d'audit
```

## Tests

Vitest + React Testing Library. La suite couvre la logique qui a vraiment de la valeur à tester unitairement : le client HTTP (`lib/httpClient.test.ts`), l'état d'auth (`auth/AuthContext.test.tsx`), la garde de route (`auth/ProtectedRoute.test.tsx`), les composants interactifs partagés (`OtpInputGroup`, `StatusChip`), et la validation d'un formulaire représentatif (`Login.test.tsx`). Pas de tests end-to-end contre un vrai backend : il n'en existe pas encore.

## Notes de conception

- **Tailwind config** (`tailwind.config.js`) reprend exactement les tokens du design system (couleurs, typo, spacing, radius) définis dans `../signsecure_trustflow/DESIGN.md`.
- **Shells partagés** : sidebar, header et bottom nav mobile ne sont écrits qu'une fois (`components/layout`) au lieu d'être dupliqués par écran comme dans l'export Stitch d'origine.
- **Parcours à token unique** (signataire externe via `/signer/:token`, magie du lien à usage unique) : un seul composant orchestrateur (`SignerInvite`) pilote les étapes dessin → OTP → succès sans navigation router intermédiaire — même principe appliqué côté Trace pour la validation d'un dossier (`Observations`).
- **Lacunes du contrat documentées dans le code, jamais comblées par de la donnée inventée** : chaque écran où `API_CONTRACT.md` ne fournit pas un champ ou un endpoint (ex. sous-schéma du rapport de preuve, liste des dossiers Trace, détail d'un transfert avant confirmation, matrice de permissions éditable) porte un commentaire `NOTE` expliquant l'hypothèse prise ou la fonctionnalité retirée plutôt que simulée.
- **Vocabulaire et RBAC** : voir `CLAUDE.md` — jamais "authentifié/certifié/garanti/identique", toujours icône + texte sur un statut, rôles limités au référentiel de `roles.ts`.

## Prochaine étape : le back

Tous les appels réseau sont déjà écrits contre `API_CONTRACT.md` ; il reste à implémenter les 33 endpoints côté serveur. Les hypothèses non fixées par le contrat (valeurs d'énumération, sous-schémas de certaines réponses) sont listées dans les messages de commit de chaque module et en commentaire dans le code concerné — à confirmer avant de figer l'implémentation back.
