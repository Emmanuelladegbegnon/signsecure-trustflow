import { randomUUID } from 'node:crypto'
import type { Role } from '@prisma/client'
import type { Actor } from '../../lib/actor.js'
import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent, verifyAuditChain } from '../../lib/audit.js'
import { anchorOrganizationAuditChain } from '../../lib/auditAnchor.js'
import { fromRoleLabel, toRoleLabels } from '../../lib/roles.js'
import { toStatusLabel } from '../../lib/userStatus.js'
import { sendEmail } from '../../lib/notify.js'
import { normalizePhone } from '../../lib/phone.js'

const INVITATION_EXPIRY_DAYS = 7


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
  // Numéro normalisé au format international : il sert de second canal (SMS)
  // pour l'OTP de signature, distinct de l'email.
  const telephone = normalizePhone(input.telephone)
  if (!telephone) throw ApiError.badRequest('INVALID_PHONE', `Numéro de téléphone invalide pour ${input.email}.`)

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw ApiError.conflict('EMAIL_ALREADY_USED', 'Un compte existe déjà avec cet email.')

  const user = await prisma.user.create({
    data: {
      organizationId: actor.organizationId,
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      telephone,
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
    userAgent: actor.userAgent,
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
    userAgent: actor.userAgent,
  })

  return { success: true as const }
}

/**
 * Suspension / réactivation d'un compte — transition de statut centralisée
 * (CLAUDE.md § "couche métier partagée") : jamais d'écriture directe de
 * `statut` depuis la route. requireAuth revérifie ce statut en base à chaque
 * requête (middleware/auth.ts), donc une suspension coupe l'accès
 * immédiatement, même sur un token encore valide.
 */
export async function updateUserStatus(userId: string, statusLabel: 'actif' | 'suspendu', actor: Actor) {
  if (userId === actor.id) {
    throw ApiError.badRequest('CANNOT_SELF_SUSPEND', 'Vous ne pouvez pas modifier le statut de votre propre compte.')
  }

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId } })
  if (!user) throw ApiError.notFound('Utilisateur introuvable.')

  if (statusLabel === 'suspendu') {
    if (user.statut !== 'ACTIF') {
      throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Seul un compte actif peut être suspendu.')
    }
    await prisma.user.update({ where: { id: userId }, data: { statut: 'SUSPENDU' } })
    await recordAuditEvent({
      organizationId: actor.organizationId,
      actorId: actor.id,
      actorLabel: actor.label,
      action: 'USER_SUSPENDED',
      objectType: 'User',
      objectId: userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
    })
  } else {
    if (user.statut !== 'SUSPENDU') {
      throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Seul un compte suspendu peut être réactivé.')
    }
    // La réactivation remet aussi le compteur de tentatives échouées à zéro :
    // pas de raison de garder un verrouillage hérité d'avant la suspension.
    await prisma.user.update({ where: { id: userId }, data: { statut: 'ACTIF', failedLoginAttempts: 0, lockedUntil: null } })
    await recordAuditEvent({
      organizationId: actor.organizationId,
      actorId: actor.id,
      actorLabel: actor.label,
      action: 'USER_REACTIVATED',
      objectType: 'User',
      objectId: userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
    })
  }

  return { success: true as const }
}

/**
 * Annulation d'une invitation jamais activée — suppression définitive
 * autorisée uniquement au statut INVITE : ce compte n'a jamais pu se
 * connecter ni agir (requireAuth exige statut ACTIF), donc il ne peut être
 * référencé comme acteur d'aucun événement d'audit ni d'aucun dossier.
 * Un compte ACTIF ou SUSPENDU ne se supprime jamais — seule la suspension
 * (ci-dessus) retire l'accès, pour ne jamais perdre la traçabilité d'actions
 * réellement effectuées.
 */
export async function deleteInvitedUser(userId: string, actor: Actor) {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId } })
  if (!user) throw ApiError.notFound('Utilisateur introuvable.')
  if (user.statut !== 'INVITE') {
    throw ApiError.conflict('CANNOT_DELETE_ACTIVE_USER', 'Seule une invitation encore en attente peut être supprimée — suspendez un compte déjà actif à la place.')
  }

  await prisma.user.delete({ where: { id: userId } })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'USER_INVITATION_CANCELLED',
    objectType: 'User',
    objectId: userId,
    ip: actor.ip,
    userAgent: actor.userAgent,
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

/** Ancrage manuel du journal (en plus de l'ancrage planifié) — voir lib/auditAnchor.ts. */
export async function anchorAuditChain(actor: Actor) {
  const anchor = await anchorOrganizationAuditChain(actor.organizationId, { actorId: actor.id, actorLabel: actor.label, ip: actor.ip })
  if (!anchor) throw ApiError.badRequest('EMPTY_AUDIT_LOG', "Le journal d'audit est vide : rien à ancrer.")
  return { ancrageId: anchor.id, lastEventHash: anchor.lastEventHash, destinataires: anchor.sentTo, date: anchor.createdAt }
}

export async function getAuditIntegrity(organizationId: string) {
  const [chain, anchors] = await Promise.all([
    verifyAuditChain(organizationId),
    prisma.auditAnchor.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ])
  return {
    chaineIntacte: chain.intact,
    ruptureEvenementId: chain.brokenAtEventId ?? null,
    ancrages: anchors.map((a) => ({
      id: a.id,
      date: a.createdAt,
      lastEventHash: a.lastEventHash,
      nombreEvenements: a.eventCount,
      chaineIntacte: a.chainIntact,
      destinataires: a.sentTo,
      horodatageTiers: a.tsaGenTime,
    })),
  }
}

/**
 * Contrôle d'un ancrage reçu hors système : le hash collé (tiré d'un email
 * d'ancrage) doit toujours figurer dans le journal, et la chaîne doit être
 * intacte jusqu'à lui. S'il a disparu, le journal a été réécrit.
 */
export async function checkAnchorHash(organizationId: string, hash: string, actor: Actor) {
  const normalized = hash.trim().toLowerCase()
  const events = await prisma.auditEvent.findMany({ where: { organizationId }, orderBy: { timestampServer: 'asc' }, select: { id: true, eventHash: true, timestampServer: true } })
  const position = events.findIndex((e) => e.eventHash === normalized)
  const chain = await verifyAuditChain(organizationId)
  const brokenIndex = chain.brokenAtEventId ? events.findIndex((e) => e.id === chain.brokenAtEventId) : -1
  const anchor = await prisma.auditAnchor.findFirst({ where: { organizationId, lastEventHash: normalized } })

  await recordAuditEvent({
    organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'AUDIT_ANCHOR_CHECKED',
    objectType: 'AuditAnchor',
    objectId: anchor?.id ?? 'externe',
    ip: actor.ip,
    userAgent: actor.userAgent,
    details: { hash: normalized, trouve: position >= 0 },
  })

  if (position < 0) {
    return {
      trouve: false as const,
      conclusion:
        "Ce hash ne figure plus dans le journal. Si vous l'avez reçu dans un email d'ancrage de cette organisation, le journal a été modifié depuis : alertez un administrateur et conservez l'email.",
    }
  }
  const intactUpToHere = brokenIndex < 0 || brokenIndex > position
  return {
    trouve: true as const,
    evenementId: events[position]!.id,
    date: events[position]!.timestampServer,
    position: position + 1,
    nombreEvenements: events.length,
    chaineIntacteJusquIci: intactUpToHere,
    ancrageEnregistre: Boolean(anchor),
    conclusion: intactUpToHere
      ? "Hash présent à sa position et chaîne conforme jusqu'à lui : aucune réécriture détectée pour cette période."
      : "Hash présent, mais la chaîne est rompue avant lui : des événements antérieurs ont été modifiés.",
  }
}
