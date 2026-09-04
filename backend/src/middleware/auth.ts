import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { verifySessionToken } from '../lib/jwt.js'
import { asyncHandler } from './asyncHandler.js'

/**
 * Vérifie le Bearer token et réhydrate req.auth depuis la base (pas seulement
 * depuis le JWT) : un compte suspendu entre-temps perd l'accès immédiatement,
 * même si son token n'est pas encore expiré.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized()

  let payload
  try {
    payload = verifySessionToken(header.slice('Bearer '.length))
  } catch {
    throw ApiError.unauthorized('Session invalide ou expirée.')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } })
  if (!user || user.statut !== 'ACTIF') throw ApiError.unauthorized('Session invalide ou expirée.')

  req.auth = { sub: user.id, organizationId: user.organizationId, roles: user.roles.map((r) => r.role), nom: user.nom, prenom: user.prenom }
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
