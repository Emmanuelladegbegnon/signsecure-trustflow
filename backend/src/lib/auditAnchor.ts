/**
 * Ancrage externe du journal d'audit. Le chaînage par hash rend visible une
 * modification isolée, mais quelqu'un qui a un accès en écriture à la base
 * pourrait recalculer toute la chaîne. Pour s'en prémunir, le dernier hash
 * de la chaîne est régulièrement envoyé HORS du système :
 *   - par email aux superviseurs et administrateurs de l'organisation ;
 *   - en option, auprès d'un serveur d'horodatage tiers (RFC 3161).
 * Une chaîne recalculée ne correspondrait plus aux hash déjà reçus par email.
 */
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { prisma } from '../db.js'
import { recordAuditEvent, verifyAuditChain } from './audit.js'
import { sendEmail } from './notify.js'
import { requestTimestamp } from './tsa.js'
import { timestampsDir } from './storage.js'

export async function anchorOrganizationAuditChain(organizationId: string, trigger: { actorId: string | null; actorLabel: string; ip: string }) {
  const [chain, lastEvent, eventCount, organization] = await Promise.all([
    verifyAuditChain(organizationId),
    prisma.auditEvent.findFirst({ where: { organizationId }, orderBy: { timestampServer: 'desc' } }),
    prisma.auditEvent.count({ where: { organizationId } }),
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
  ])
  if (!lastEvent) return null

  const recipients = await prisma.user.findMany({
    where: { organizationId, statut: 'ACTIF', roles: { some: { role: { in: ['SUPERVISEUR', 'ADMINISTRATEUR'] } } } },
  })
  const now = new Date()
  const body =
    `Ancrage du journal d'audit SignSecure — ${organization.nom}\n\n` +
    `Date (serveur) : ${now.toISOString()}\n` +
    `Nombre d'événements : ${eventCount}\n` +
    `Dernier événement : ${lastEvent.id} (${lastEvent.timestampServer.toISOString()})\n` +
    `Hash du dernier événement : ${lastEvent.eventHash}\n` +
    `Contrôle d'intégrité de la chaîne : ${chain.intact ? 'conforme' : `RUPTURE détectée à l'événement ${chain.brokenAtEventId}`}\n\n` +
    `Conservez cet email : si le journal était réécrit plus tard, ce hash ne correspondrait plus.`

  await Promise.all(recipients.map((u) => sendEmail(u.email, `Ancrage du journal d'audit — ${now.toISOString().slice(0, 10)}`, body)))

  const timestamp = await requestTimestamp(lastEvent.eventHash)
  const anchor = await prisma.auditAnchor.create({
    data: {
      organizationId,
      lastEventId: lastEvent.id,
      lastEventHash: lastEvent.eventHash,
      eventCount,
      chainIntact: chain.intact,
      sentTo: recipients.map((u) => u.email).join(', '),
      tsaGenTime: timestamp?.genTime ?? null,
    },
  })
  if (timestamp) {
    const tsaTokenPath = path.join(timestampsDir, `ancrage-${anchor.id}.tsr`)
    await writeFile(tsaTokenPath, timestamp.der)
    await prisma.auditAnchor.update({ where: { id: anchor.id }, data: { tsaTokenPath } })
  }

  await recordAuditEvent({
    organizationId,
    actorId: trigger.actorId,
    actorLabel: trigger.actorLabel,
    action: 'AUDIT_CHAIN_ANCHORED',
    objectType: 'AuditAnchor',
    objectId: anchor.id,
    ip: trigger.ip,
    details: { lastEventHash: lastEvent.eventHash, eventCount, chainIntact: chain.intact, destinataires: recipients.length },
  })
  return anchor
}

export async function anchorAllAuditChains() {
  const organizations = await prisma.organization.findMany({ select: { id: true } })
  for (const { id } of organizations) {
    await anchorOrganizationAuditChain(id, { actorId: null, actorLabel: 'Système (ancrage planifié)', ip: 'system' })
  }
}
