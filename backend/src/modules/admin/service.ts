import { randomUUID } from 'node:crypto'
import type { Role } from '@prisma/client'
import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { fromRoleLabel, toRoleLabels } from '../../lib/roles.js'
import { toStatusLabel } from '../../lib/userStatus.js'
import { sendEmail } from '../../lib/notify.js'

const INVITATION_EXPIRY_DAYS = 7

interface Actor {
  id: string
  organizationId: string
  label: string
  ip: string
}

export async function listUsers(organizationId: string) {
  const users = await prisma.user.findMany({ where: { organizationId }, include: { roles: true }, orderBy: { createdAt: 'asc' } })
  return {
    users: users.map((u) => ({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      roles: toRoleLabels(u.roles.map((r) => r.role)),
      statut: toStatusLabel(u.statut),
    })),
  }
}

function resolveRoles(labels: string[]): Role[] {
  const resolved = labels.map((label) => ({ label, role: fromRoleLabel(label) }))
  const unknown = resolved.filter((r) => !r.role)
  if (unknown.length > 0) {
    throw ApiError.badRequest('UNKNOWN_ROLE', `Rôle(s) inconnu(s) : ${unknown.map((r) => r.label).join(', ')}`)
  }
  return resolved.map((r) => r.role!)
}

async function createInvitedUser(
  input: { nom: string; prenom: string; email: string; telephone: string; roles: string[] },
  actor: Actor,
) {
  const roles = resolveRoles(input.roles)

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw ApiError.conflict('EMAIL_ALREADY_USED', 'Un compte existe déjà avec cet email.')

  const user = await prisma.user.create({
    data: {
      organizationId: actor.organizationId,
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      telephone: input.telephone,
      statut: 'INVITE',
      roles: { create: roles.map((role) => ({ role })) },
    },
  })

  const token = randomUUID()
  await prisma.invitationToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 86_400_000) },
  })

  await sendEmail(
    user.email,
    'Invitation SignSecure TrustFlow',
    `Bonjour ${input.prenom},\n\nUn compte a été créé pour vous. Activez-le (valable ${INVITATION_EXPIRY_DAYS} jours) :\n${env.frontendBaseUrl}/activation/${token}`,
  )

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'USER_INVITED',
    objectType: 'User',
    objectId: user.id,
    ip: actor.ip,
  })

  return user
}

export async function createUser(
  input: { nom: string; prenom: string; email: string; telephone: string; roles: string[] },
  actor: Actor,
) {
  const user = await createInvitedUser(input, actor)
  return { userId: user.id }
}

export async function bulkCreateUsers(
  input: Array<{ nom: string; prenom: string; email: string; telephone: string; roles: string[] }>,
  actor: Actor,
) {
  const created: Array<{ userId: string; email: string }> = []
  const errors: Array<{ email: string; reason: string }> = []

  // Chaque ligne est traitée indépendamment (API_CONTRACT.md § Admin — bulk) :
  // un email invalide ou déjà existant ne doit pas bloquer les autres lignes.
  for (const row of input) {
    try {
      const user = await createInvitedUser(row, actor)
      created.push({ userId: user.id, email: user.email })
    } catch (err) {
      const reason = err instanceof ApiError ? err.message : 'Erreur inattendue.'
      errors.push({ email: row.email, reason })
    }
  }

  return { created, errors }
}

export async function listPermissionProfiles() {
  const profiles = await prisma.permissionProfile.findMany({ orderBy: { nom: 'asc' } })
  return {
    profils: profiles.map((p) => ({ id: p.id, nom: p.nom, description: p.description, permissions: p.permissions as string[] })),
  }
}

export async function updateUserRoles(userId: string, labels: string[], actor: Actor) {
  const roles = resolveRoles(labels)
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId } })
  if (!user) throw ApiError.notFound('Utilisateur introuvable.')

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({ data: roles.map((role) => ({ userId, role })) }),
  ])

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'USER_ROLES_UPDATED',
    objectType: 'User',
    objectId: userId,
    ip: actor.ip,
  })

  return { success: true as const }
}

export async function getAuditLog(organizationId: string, filters: { acteur?: string; action?: string; date?: string }) {
  const events = await prisma.auditEvent.findMany({
    where: {
      organizationId,
      ...(filters.acteur ? { actorId: filters.acteur } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.date ? { timestampServer: { gte: new Date(`${filters.date}T00:00:00`), lt: new Date(`${filters.date}T23:59:59`) } } : {}),
    },
    orderBy: { timestampServer: 'desc' },
    take: 500,
  })

  return {
    evenements: events.map((e) => ({
      actorId: e.actorId,
      action: e.action,
      objectType: e.objectType,
      objectId: e.objectId,
      timestampServer: e.timestampServer,
      ip: e.ip,
      hash: e.eventHash,
    })),
  }
}
