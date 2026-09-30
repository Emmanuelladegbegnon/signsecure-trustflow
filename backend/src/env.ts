import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:5174'),
  frontendBaseUrl: required('FRONTEND_BASE_URL', 'http://localhost:5174'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '2h'),
  uploadDir: required('UPLOAD_DIR', './uploads'),
  otpProvider: required('OTP_PROVIDER', 'console'),
  // Provider des emails "métier" (invitation, lien de signature) — indépendant
  // de OTP_PROVIDER pour pouvoir activer l'un sans l'autre. "console" (défaut)
  // journalise côté serveur ; "smtp" envoie un vrai email via mailer.ts.
  emailProvider: required('EMAIL_PROVIDER', 'console'),
  // Configuration SMTP partagée par otpProvider.ts et notify.ts quand l'un des
  // deux providers ci-dessus vaut "smtp". Optionnelle sinon — voir .env.example.
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM ?? 'SignSecure TrustFlow <no-reply@signsecure.demo>',
  signerLinkExpiryHours: Number(process.env.SIGNER_LINK_EXPIRY_HOURS ?? 48),
  accountLockThreshold: Number(process.env.ACCOUNT_LOCK_THRESHOLD ?? 5),
  accountLockMinutes: Number(process.env.ACCOUNT_LOCK_MINUTES ?? 15),
  // Cookie de session « Secure » (HTTPS uniquement). Activé par défaut en production.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  // Nombre de proxys devant l'API (hébergeur, reverse proxy). 0 = aucun : l'IP
  // vue est celle de la connexion. Mal réglé, toutes les requêtes semblent
  // venir de la même IP (limites de débit et journal faussés) ou l'IP peut
  // être usurpée via X-Forwarded-For.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  // Expiration de session après inactivité, vérifiée côté serveur à chaque requête authentifiée.
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES ?? 15),

  // OTP de signature par SMS (canal distinct de l'email qui reçoit le lien).
  // "simulation" (défaut) journalise le SMS côté serveur, clairement étiqueté ;
  // "twilio" envoie un vrai SMS via l'API REST Twilio (TWILIO_* requis).
  smsProvider: required('SMS_PROVIDER', 'simulation'),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFrom: process.env.TWILIO_FROM,
  // Indicatif ajouté aux numéros saisis sans "+" (229 = Bénin).
  defaultPhoneCountryCode: process.env.DEFAULT_PHONE_COUNTRY_CODE ?? '229',

  // Chiffrement des fichiers au repos (AES-256-GCM). 64 caractères hex (32 octets).
  // Absent : les fichiers restent en clair (un avertissement est journalisé au démarrage).
  fileEncryptionKey: process.env.FILE_ENCRYPTION_KEY,
  // Trousseau de clés pour le changement de clé : "v2:hex,v1:hex" (la première est en service).
  fileEncryptionKeys: process.env.FILE_ENCRYPTION_KEYS,
  // Sauvegardes chiffrées : dossier de destination (idéalement un disque externe ou un
  // montage réseau) et clé DISTINCTE de celle des fichiers (64 hex).
  backupDir: process.env.BACKUP_DIR ?? '',
  backupKey: process.env.BACKUP_KEY ?? '',
  backupIntervalHours: Number(process.env.BACKUP_INTERVAL_HOURS ?? 24),

  // Cachet de plateforme PAdES — certificat AUTO-SIGNÉ de démonstration, non
  // qualifié. Généré automatiquement au premier démarrage s'il n'existe pas.
  // Le fichier .p12 ne doit jamais être commité (dossier keys/ ignoré par git).
  sealP12Path: process.env.SEAL_P12_PATH ?? './keys/cachet-demo.p12',
  sealP12Passphrase: process.env.SEAL_P12_PASSPHRASE,

  // Horodatage par un tiers (RFC 3161) — désactivé si vide. Seule l'empreinte
  // SHA-256 est envoyée au serveur d'horodatage, jamais le document.
  tsaUrl: process.env.TSA_URL ?? '',

  // Secret des jetons de page imprimés dans les QR (lib/pageToken.ts). À défaut, dérivé de JWT_SECRET.
  pageTokenSecret: process.env.PAGE_TOKEN_SECRET || `page-token:${process.env.JWT_SECRET ?? ''}`,

  // Domaine public imprimé sous le QR du PDF signé (ancre contre les faux sites de vérification).
  publicVerifyBaseUrl: process.env.PUBLIC_VERIFY_BASE_URL ?? process.env.FRONTEND_BASE_URL ?? 'http://localhost:5174',

  // Tâches planifiées (relances de signature, ancrage du journal d'audit).
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== 'false',
  signerReminderHoursBeforeExpiry: Number(process.env.SIGNER_REMINDER_HOURS_BEFORE_EXPIRY ?? 24),
  auditAnchorIntervalHours: Number(process.env.AUDIT_ANCHOR_INTERVAL_HOURS ?? 24),
}
