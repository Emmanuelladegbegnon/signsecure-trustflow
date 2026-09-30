import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { verifySessionToken } from '../lib/jwt.js'
import { recordAuditEvent } from '../lib/audit.js'
import { env } from '../env.js'
import { asyncHandler } from './asyncHandler.js'
import { CSRF_HEADER, CSRF_VALUE, readSessionCookie } from '../lib/sessionCookie.js'

// Évite une écriture en base à chaque requête : l'activité n'est rafraîchie qu'au-delà de ce délai.
const ACTIVITY_REFRESH_MS = 30_000

/**
 * Lit le jeton dans le cookie de session httpOnly et réhydrate req.auth depuis la base (pas seulement
 * depuis le JWT) : un compte suspendu entre-temps perd l'accès immédiatement,
 * même si son token n'est pas encore expiré.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readSessionCookie(req)
  if (!token) throw ApiError.unauthorized()

  // Anti-CSRF : toute requête qui modifie des données doit porter l'en-tête du front.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get(CSRF_HEADER) !== CSRF_VALUE) {
    throw ApiError.forbiddenCode('CSRF_HEADER_MISSING', 'Requête refusée : en-tête de sécurité manquant.')
  }

  let payload
  try {
    payload = verifySessionToken(token)
  } catch {
    throw ApiError.unauthorized('Session invalide ou expirée.')
  }

  const session = payload.sid ? await prisma.session.findUnique({ where: { id: payload.sid } }) : null
  if (!session || session.userId !== payload.sub || session.revokedAt) throw ApiError.unauthorized('Session invalide ou expirée.')

  // Expiration sur inactivité, décidée côté serveur (CLAUDE.md § Sécurité).
  const now = Date.now()
  if (now - session.lastActivityAt.getTime() > env.sessionIdleMinutes * 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date(now), revokedReason: 'IDLE_TIMEOUT' } })
    await recordAuditEvent({
      organizationId: payload.organizationId,
      actorId: payload.sub,
      actorLabel: 'Système (expiration de session)',
      action: 'SESSION_EXPIRED_IDLE',
      objectType: 'Session',
      objectId: session.id,
      ip: req.ip ?? '',
      userAgent: req.get('user-agent') ?? null,
    })
    throw new ApiError(401, 'SESSION_IDLE_TIMEOUT', `Session expirée après ${env.sessionIdleMinutes} minutes d'inactivité. Veuillez vous reconnecter.`)
  }
  if (now - session.lastActivityAt.getTime() > ACTIVITY_REFRESH_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastActivityAt: new Date(now) } })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } })
  if (!user || user.statut !== 'ACTIF') throw ApiError.unauthorized('Session invalide ou expirée.')

  req.auth = { sub: user.id, organizationId: user.organizationId, roles: user.roles.map((r) => r.role), sid: session.id, nom: user.nom, prenom: user.prenom }
  next()
})

/** Autorisation par rôle — le client n'a jamais son mot à dire, uniquement ce que req.auth (dérivé du token vérifié) contient. */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw ApiError.unauthorized()
    if (!req.auth.roles.some((role) => allowed.includes(role as Role))) throw ApiError.forbidden()
    next()
  }
}
