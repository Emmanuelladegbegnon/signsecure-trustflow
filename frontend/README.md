# SignSecure TrustFlow — Front-end

SPA React + Vite + TypeScript + Tailwind, construite à partir des 28 maquettes Stitch du dossier parent. Découplée du back-end : toutes les données affichées sont pour l'instant des constantes locales (mock), prêtes à être remplacées par de vrais appels API.

## Démarrer

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de prod dans dist/
npm run preview   # sert le build de prod localement
npm run lint       # oxlint
```

## Structure

```
src/
  routes.ts                 # Table centrale de toutes les routes (source unique de vérité)
  App.tsx                   # Déclaration des <Route> react-router
  components/
    layout/
      AppShell.tsx           # Layout authentifié standard : sidebar desktop + header + bottom nav mobile
      PublicShell.tsx         # Layout centré sans navigation (login, OTP, écrans transactionnels)
      DesktopSidebar.tsx / TopHeader.tsx / MobileBottomNav.tsx
      nav.ts                  # Définition unique des items de navigation (icônes, labels, routes)
    ui/
      Icon.tsx                 # Wrapper Material Symbols Outlined
      StatusChip.tsx            # Chip de statut (Validé / En attente / Rejeté / Révoqué...)
      OtpInputGroup.tsx          # Saisie OTP à 6 chiffres avec auto-avance (réutilisé 2x)
  pages/
    auth/            Connexion, OTP de connexion
    dashboard/        Tableau de bord, Mes dossiers
    signature/         Nouveau document → Signataires → Signature → OTP → Succès → Rapport de preuve
    verification/       Vérification publique, Code inconnu, Résultat valide/révoqué, Comparaison de fichiers
    traceability/         Liste des documents tracés, Détail (chaîne de garde)
    mobile/                 Enregistrement physique (étapes 1-4), Incident, Transfert (demande/réception)
    admin/                    Utilisateurs, Journal d'audit, Matrice des permissions
```

## Notes de conception

- **Tailwind config** (`tailwind.config.js`) reprend exactement les tokens du design system (couleurs, typo, spacing, radius) définis dans `../signsecure_trustflow/DESIGN.md` — cohérent avec les 28 maquettes sources.
- **Shells partagés** : la sidebar, le header et la bottom nav mobile ne sont écrits qu'une fois (`components/layout`) au lieu d'être dupliqués sur 20+ écrans comme dans l'export Stitch d'origine.
- **Composants interactifs réels** ajoutés là où les maquettes n'avaient que du HTML statique : signature à main levée sur `<canvas>` (`ApplySignature`), toggles fonctionnels (`Observations`, `PermissionsMatrix`), copier-coller du hash (`RegistrationConfirmation`), drag & drop de fichier (`FileComparison`).
- **Images placeholder externes** (avatars, QR codes factices hébergés sur `lh3.googleusercontent.com/aida-public/...` dans l'export Stitch) remplacées par des icônes Material locales — évite une dépendance à des URLs d'aperçu non garanties en production.
- Deux corrections de bug repérées pendant la revue du design (layout cassé sur l'écran de résultat de vérification valide, animation d'entrée sans fallback `prefers-reduced-motion`) sont intégrées nativement ici.

## Prochaine étape : le back

Chaque page consomme des données mock définies en tête de fichier (`const STATS = [...]`, `const ACTIVITY = [...]`, etc.). Le point d'intégration naturel est de remplacer ces constantes par des hooks de data-fetching (React Query, SWR, ou autre) une fois l'API disponible ; les composants d'UI n'ont pas besoin de changer.
