import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { signSessionToken } from '../../lib/jwt.js'
import { generateOtpCode, hashOtpCode, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '../../lib/otp.js'
import { getOtpProvider } from '../../lib/otpProvider.js'
import { toRoleLabels } from '../../lib/roles.js'

interface RequestMeta {
  ip: string
}

function otpChannelFor(): 'email' {
  // MVP : un seul canal fiable garanti disponible pour tout compte (l'email,
  // toujours renseigné et validé) ; le téléphone n'est pas vérifié à la
  // création du compte. Voir CLAUDE.md — choisir l'option la plus simple et
  // robuste plutôt que la plus sophistiquée.
  return 'email'
}

async function issueLoginOtp(userId: string, email: string) {
  const code = generateOtpCode()
  const now = new Date()
  await prisma.otpChallenge.create({
    data: {
      purpose: 'LOGIN',
      userId,
      codeHash: hashOtpCode(code),
      channel: otpChannelFor(),
      expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
      nextResendAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
    },
  })
  await getOtpProvider().send({ channel: otpChannelFor(), destination: email, code })
}

export async function getInvitation(token: string) {
  const invitation = await prisma.invitationToken.findUnique({ where: { token }, include: { user: true } })
  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    throw ApiError.gone("Cette invitation a expiré ou a déjà été utilisée.")
  }
  const { user } = invitation
  return { nom: user.nom, prenom: user.prenom, email: user.email }
}

export async function activateAccount(token: string, password: string, meta: RequestMeta) {
  const invitation = await prisma.invitationToken.findUnique({ where: { token }, include: { user: true } })
  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    throw ApiError.gone("Cette invitation a expiré ou a déjà été utilisée.")
  }

  const passwordHash = await hashPassword(password)
  await prisma.$transaction([
    prisma.user.update({ where: { id: invitation.userId }, data: { passwordHash, statut: 'ACTIF' } }),
    prisma.invitationToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ])

  await recordAuditEvent({
    organizationId: invitation.user.organizationId,
    actorId: invitation.userId,
    actorLabel: `${invitation.user.prenom} ${invitation.user.nom}`,
    action: 'ACCOUNT_ACTIVATED',
    objectType: 'User',
    objectId: invitation.userId,
    ip: meta.ip,
  })

  return { success: true as const }
}

export async function login(email: string, password: string, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email } })

  // Message générique dans tous les cas d'échec : ne jamais indiquer si
  // c'est l'email ou le mot de passe qui est en cause (énumération de comptes).
  const invalidCredentials = () => ApiError.unauthorized('Email ou mot de passe incorrect.')

  if (!user || user.statut !== 'ACTIF' || !user.passwordHash) throw invalidCredentials()

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.unauthorized('Compte temporairement verrouillé suite à plusieurs tentatives échouées. Réessayez plus tard.')
  }

  const validPassword = await verifyPassword(password, user.passwordHash)
  if (!validPassword) {
    const attempts = user.failedLoginAttempts + 1
    const locked = attempts >= env.accountLockThreshold
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + env.accountLockMinutes * 60_000) : null,
      },
    })
    if (locked) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        actorLabel: `${user.prenom} ${user.nom}`,
        action: 'ACCOUNT_LOCKED',
        objectType: 'User',
        objectId: user.id,
        ip: meta.ip,
      })
    }
    throw invalidCredentials()
  }

  await issueLoginOtp(user.id, user.email)
  return { requiresOtp: true as const, otpChannel: otpChannelFor() }
}

export async function verifyLoginOtp(email: string, code: string, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email }, include: { roles: true } })
  const invalidOtp = () => ApiError.unauthorized('Code invalide ou expiré.')
  if (!user) throw invalidOtp()

  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId: user.id, purpose: 'LOGIN', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) throw invalidOtp()

  if (challenge.codeHash !== hashOtpCode(code)) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } })
    throw invalidOtp()
  }

  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } }),
  ])

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    actorLabel: `${user.prenom} ${user.nom}`,
    action: 'LOGIN_SUCCESS',
    objectType: 'User',
    objectId: user.id,
    ip: meta.ip,
  })

  const roles = user.roles.map((r) => r.role)
  const token = signSessionToken({ sub: user.id, organizationId: user.organizationId, roles })
  return { token, user: { id: user.id, nom: user.nom, prenom: user.prenom, roles: toRoleLabels(roles) } }
}

export async function resendLoginOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  // Réponse identique que le compte existe ou non — évite l'énumération d'emails.
  const generic = () => ({ success: true as const, nextResendAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString() })
  if (!user || user.statut !== 'ACTIF') return generic()

  const lastChallenge = await prisma.otpChallenge.findFirst({
    where: { userId: user.id, purpose: 'LOGIN', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (lastChallenge && lastChallenge.nextResendAt > new Date()) {
    throw ApiError.conflict('RESEND_TOO_SOON', 'Veuillez patienter avant de redemander un code.')
  }

  await issueLoginOtp(user.id, user.email)
  const refreshed = await prisma.otpChallenge.findFirst({
    where: { userId: user.id, purpose: 'LOGIN', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return { success: true as const, nextResendAt: (refreshed?.nextResendAt ?? new Date()).toISOString() }
}

export async function logout(userId: string, organizationId: string, meta: RequestMeta) {
  // JWT sans état : rien à invalider côté serveur pour ce MVP (durée de vie
  // courte déjà configurée via JWT_EXPIRES_IN). On trace tout de même
  // l'action pour l'audit.
  const user = await prisma.user.findUnique({ where: { id: userId } })
  await recordAuditEvent({
    organizationId,
    actorId: userId,
    actorLabel: user ? `${user.prenom} ${user.nom}` : 'Utilisateur',
    action: 'LOGOUT',
    objectType: 'User',
    objectId: userId,
    ip: meta.ip,
  })
  return { success: true as const }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: true } })
  return { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, roles: toRoleLabels(user.roles.map((r) => r.role)) }
}
