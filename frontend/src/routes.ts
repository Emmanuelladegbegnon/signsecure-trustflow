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
  /** Adresse courte encodée dans le QR de chaque page (QR moins dense, lisible même imprimé petit). */
  shortPageLink: '/v/:code/:page/:k',

  /** Liste des documents en cours de traçabilité (GET /api/documents, filtré côté client sur origine=trace — pas d'endpoint de liste dédié dans le contrat). */
  traceabilityList: '/tracabilite',
  /** Chaîne de garde d'un dossier Trace donné (GET /api/trace/:id/timeline). */
  traceabilityDetail: '/tracabilite/:id/detail',

  /** POST /api/trace/enregistrement — crée le dossier (brouillon). */
  mobileRegistrationStep1: '/mobile/enregistrement/etape-1',
  /** POST /api/trace/:id/capture — étapes suivantes toutes rattachées au dossier créé. */
  mobileCapture: '/mobile/enregistrement/:id/capture',
  /**
   * POST /api/trace/:id/observations, puis — si le compte a le rôle
   * Superviseur — POST /api/trace/:id/valider dans la foulée (le contrat
   * n'expose aucun endpoint de "file d'attente à valider" séparé). Le code
   * de suivi et l'étiquette générés sont affichés en état interne de cette
   * même page (pages/mobile/Observations.tsx), pas des routes à part.
   */
  mobileObservations: '/mobile/enregistrement/:id/observations',
  /** POST /api/trace/:id/incident. */
  mobileIncident: '/mobile/trace/:id/incident',

  /** POST /api/trace/:id/transfert. */
  mobileTransferRequest: '/mobile/trace/:id/transfert',
  /** POST /api/trace/transfert/:transfertId/confirmer. */
  mobileTransferReception: '/mobile/transfert/:transfertId/reception',

  /** Contrôle des pièces d'identité des signataires (Vérificateur, Superviseur). */
  identityReview: '/identites',
  adminUsers: '/admin/utilisateurs',
  adminAuditLog: '/admin/audit',
  adminPermissions: '/admin/permissions',

  /** Page publique : finalités, durées de conservation, droits (Code du numérique, art. 405 et suivants). */
  personalData: '/donnees-personnelles',
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

/** Chaîne de garde d'un dossier Trace donné. */
export const traceabilityDetailUrl = (id: string) => `/tracabilite/${id}/detail`

/** Étape "capture photo" d'un dossier Trace donné. */
export const traceCaptureUrl = (id: string) => `/mobile/enregistrement/${id}/capture`

/** Étape "observations" d'un dossier Trace donné. */
export const traceObservationsUrl = (id: string) => `/mobile/enregistrement/${id}/observations`

/** Déclaration d'incident pour un dossier Trace donné. */
export const traceIncidentUrl = (id: string) => `/mobile/trace/${id}/incident`

/** Demande de transfert pour un dossier Trace donné. */
export const traceTransferRequestUrl = (id: string) => `/mobile/trace/${id}/transfert`

/** Confirmation de réception pour un transfert donné. */
export const traceTransferReceptionUrl = (transfertId: string) => `/mobile/transfert/${transfertId}/reception`
