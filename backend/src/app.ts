import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { authRouter } from './modules/auth/routes.js'
import { documentsRouter, signLinkRouter } from './modules/sign/routes.js'
import { verifyRouter } from './modules/verify/routes.js'
import { traceRouter } from './modules/trace/routes.js'
import { adminRouter } from './modules/admin/routes.js'

/** App Express configurée mais pas démarrée — séparée d'index.ts pour être importable telle quelle par les tests (supertest). */
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Derrière un hébergeur ou un reverse proxy, TRUST_PROXY = nombre de proxys de confiance.
  app.set('trust proxy', env.trustProxy)

  app.use(helmet())
  app.use(cors({ origin: env.corsOrigin, credentials: true }))
  app.use(express.json({ limit: '15mb' })) // marge pour la signature dessinée en base64 (transitoire, jamais persistée — voir lib/pendingSignatures.ts)

  // Brute force : limite additionnelle aux tentatives de connexion/OTP, en
  // complément du verrouillage de compte (qui lui protège un compte donné,
  // pas l'endpoint dans son ensemble).
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false })
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/otp', authLimiter)
  // Parcours public du signataire (lien + OTP) : limite par IP en plus des
  // essais par code et du plafond de renvois.
  app.use('/api/sign/link', rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }))

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api/auth', authRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/sign/link', signLinkRouter)
  app.use('/api/verify', verifyRouter)
  app.use('/api/trace', traceRouter)
  app.use('/api/admin', adminRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
