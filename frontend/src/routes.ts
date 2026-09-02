// Central route map — single source of truth for every path in the app.
// Keeps navigation links (sidebar, bottom nav, inter-screen CTAs) in sync.
export const ROUTES = {
  login: '/connexion',
  otpLogin: '/otp',

  dashboard: '/tableau-de-bord',
  myFolders: '/mes-dossiers',

  newDocument: '/documents/nouveau',
  assignSigners: '/documents/signataires',
  applySignature: '/documents/signer',
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
