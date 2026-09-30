/**
 * Reconfirmation avant action sensible (« step-up ») : même connecté, un
 * compte doit saisir un nouveau code juste avant de révoquer un document ou de
 * gérer des comptes et des rôles. Un poste resté ouvert ne suffit plus pour
 * faire des dégâts.
 *
 * Un code valide ouvre une fenêtre de REAUTH_WINDOW_MINUTES sur la session
 * en cours uniquement. Trop de codes faux révoquent la session.
 */
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { generateOtpCode, hashOtpCode, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '../../lib/otp.js'
import { getOtpProvider } from '../../lib/otpProvider.js'
import { maskEmail } from '../../lib/phone.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import type { Actor } from '../../lib/actor.js'

export const REAUTH_WINDOW_MINUTES = 5

export async function requestReauth(actor: Actor) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })
  const last = await prisma.otpChallenge.findFirst({ where: { userId: user.id, purpose: 'REAUTH' }, orderBy: { createdAt: 'desc' } })
  if (last && !last.consumedAt && last.nextResendAt > new Date()) {
    throw ApiError.conflict('RESEND_TOO_SOON', 'Un code vient de vous être envoyé. Patientez avant d’en redemander un.')
  }
  const now = new Date()
  await prisma.otpChallenge.updateMany({ where: { userId: user.id, purpose: 'REAUTH', consumedAt: null }, data: { expiresAt: now } })
  const code = generateOtpCode()
  await prisma.otpChallenge.create({
    data: {
      purpose: 'REAUTH',
      userId: user.id,
      codeHash: hashOtpCode(code),
      channel: 'email',
      expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
      nextResendAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
    },
  })
  await getOtpProvider().send({ channel: 'email', destination: user.email, code, purpose: 'login' })
  return { canal: 'email' as const, destination: maskEmail(user.email) }
}

export async function verifyReauth(actor: Actor, sessionId: string, code: string) {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId: actor.id, purpose: 'REAUTH', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  const invalid = () => ApiError.unauthorized('Code invalide ou expiré.')
  if (!challenge || challenge.expiresAt < new Date()) throw invalid()

  if (challenge.codeHash !== hashOtpCode(code)) {
    const attempts = challenge.attempts + 1
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts } })
    if (attempts >= OTP_MAX_ATTEMPTS) {
      // Trop d'échecs : la session est coupée, il faudra se reconnecter entièrement.
      await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date(), revokedReason: 'REAUTH_LOCKED' } })
      await recordAuditEvent({
        organizationId: actor.organizationId,
        actorId: actor.id,
        actorLabel: actor.label,
        action: 'REAUTH_LOCKED',
        objectType: 'Session',
        objectId: sessionId,
        ip: actor.ip,
        userAgent: actor.userAgent,
      })
      throw new ApiError(401, 'SESSION_REVOKED', 'Trop de codes incorrects : votre session a été fermée. Reconnectez-vous.')
    }
    throw invalid()
  }

  const until = new Date(Date.now() + REAUTH_WINDOW_MINUTES * 60_000)
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.session.update({ where: { id: sessionId }, data: { reauthUntil: until } }),
  ])
  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'REAUTH_SUCCESS',
    objectType: 'Session',
    objectId: sessionId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  })
  return { success: true as const, valableJusqua: until.toISOString() }
}

/** À placer après requireAuth sur chaque route sensible. */
export const requireRecentReauth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const session = req.auth ? await prisma.session.findUnique({ where: { id: req.auth.sid } }) : null
  if (!session?.reauthUntil || session.reauthUntil < new Date()) {
    throw ApiError.forbiddenCode('REAUTH_REQUIRED', 'Action sensible : confirmez avec le code qui vient de vous être demandé.')
  }
  next()
})
