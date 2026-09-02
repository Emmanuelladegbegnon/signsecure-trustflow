// Central route map — single source of truth for every path in the app.
// Keeps navigation links (sidebar, bottom nav, inter-screen CTAs) in sync.
export const ROUTES = {
  login: '/connexion',
  otpLogin: '/otp',
  /** Activation d'un compte créé par un administrateur, depuis le lien d'invitation reçu par email. */
  accountActivation: '/activation/:token',

  dashboard: '/tableau-de-bord',
  myFolders: '/mes-dossiers',

  newDocument: '/documents/nouveau',
  assignSigners: '/documents/:id/signataires',
  /**
   * Point d'entrée RÉEL du signataire : lien à usage unique envoyé par email
   * (jamais atteint depuis la navigation interne — voir CLAUDE.md § Sign).
   * Le pad de signature, l'OTP et l'écran de succès sont des étapes internes
   * de ce même composant (une seule session token, pas de navigation router
   * intermédiaire) — voir pages/signature/SignerInvite.tsx.
   */
  signerInvite: '/signer/:token',
  proofReport: '/documents/:id/rapport-de-preuve',

  verifyPublic: '/verifier',
  /** Résultat de GET /api/verify/:code — une seule page, qui branche son rendu sur `statut`/`origine` (code inconnu, valide, révoqué, hash exact vs score OCR). */
  verifyResult: '/verifier/resultat/:code',
  compareFiles: '/verifier/:code/comparaison',

  /** List of documents/assets currently being tracked. */
  traceabilityList: '/tracabilite',
  /** Full custody-chain timeline for a single tracked document. */
  traceabilityDetail: '/tracabilite/detail',

  mobileRegistrationStep1: '/mobile/enregistrement/etape-1',
  mobileCapture: '/mobile/enregistrement/capture',
  mobileCodeLabel: '/mobile/enregistrement/code-etiquette',
  mobileObservations: '/mobile/enregistrement/observations',
  mobileRegistrationConfirm: '/mobile/enregistrement/confirmation',
  mobileIncident: '/mobile/incident',

  mobileTransferRequest: '/mobile/transfert/demande',
  mobileTransferReception: '/mobile/transfert/reception',

  adminUsers: '/admin/utilisateurs',
  adminAuditLog: '/admin/audit',
  adminPermissions: '/admin/permissions',
} as const

/** Construit l'URL réelle d'un lien de signature à usage unique à partir d'un token. */
export const signerInviteUrl = (token: string) => `/signer/${token}`

/** Étape "signataires" d'un dossier donné. */
export const assignSignersUrl = (dossierId: string) => `/documents/${dossierId}/signataires`

/** Rapport de preuve d'un dossier donné. */
export const proofReportUrl = (dossierId: string) => `/documents/${dossierId}/rapport-de-preuve`

/** Résultat de vérification pour un code de suivi donné. */
export const verifyResultUrl = (code: string) => `/verifier/resultat/${encodeURIComponent(code)}`

/** Comparaison de fichier pour un code de suivi donné. */
export const compareFilesUrl = (code: string) => `/verifier/${encodeURIComponent(code)}/comparaison`
