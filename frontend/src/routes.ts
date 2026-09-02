// Central route map — single source of truth for every path in the app.
// Keeps navigation links (sidebar, bottom nav, inter-screen CTAs) in sync.
export const ROUTES = {
  login: '/connexion',
  otpLogin: '/otp',

  dashboard: '/tableau-de-bord',
  myFolders: '/mes-dossiers',

  newDocument: '/documents/nouveau',
  assignSigners: '/documents/signataires',
  /**
   * Point d'entrée RÉEL du signataire : lien à usage unique envoyé par email
   * (jamais atteint depuis la navigation interne — voir CLAUDE.md § Sign).
   */
  signerInvite: '/signer/:token',
  signatureOtp: '/documents/signature-otp',
  signatureSuccess: '/documents/signature-reussie',
  proofReport: '/documents/rapport-de-preuve',

  verifyPublic: '/verifier',
  verifyUnknown: '/verifier/inconnu',
  verifyValid: '/verifier/valide',
  verifyRevoked: '/verifier/revoque',
  compareFiles: '/verifier/comparaison',

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
