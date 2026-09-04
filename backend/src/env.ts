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
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:5173'),
  frontendBaseUrl: required('FRONTEND_BASE_URL', 'http://localhost:5173'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '2h'),
  uploadDir: required('UPLOAD_DIR', './uploads'),
  otpProvider: required('OTP_PROVIDER', 'console'),
  signerLinkExpiryHours: Number(process.env.SIGNER_LINK_EXPIRY_HOURS ?? 48),
  accountLockThreshold: Number(process.env.ACCOUNT_LOCK_THRESHOLD ?? 5),
  accountLockMinutes: Number(process.env.ACCOUNT_LOCK_MINUTES ?? 15),
}
