import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { generateTrackingCode } from '../../lib/trackingCode.js'
import {
  transitionCustodyTransferConfirmed,
  transitionCustodyTransferRequested,
  transitionDocumentArchived,
  transitionDocumentReceived,
  type AuditContext,
} from '../documents/status.js'

interface Actor {
  id: string
  organizationId: string
  label: string
  ip: string
}

function toAuditContext(actor: Actor): AuditContext {
  return { actorId: actor.id, actorLabel: actor.label, ip: actor.ip }
}

async function getOwnedTraceDocument(documentId: string, organizationId: string) {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId, origine: 'TRACE' } })
  if (!document) throw ApiError.notFound('Dossier introuvable.')
  return document
}

export async function registerDocument(
  input: {
    type: string
    titre: string
    reference?: string
    organismeDeclare?: string
    dateIndiquee: string
    nombrePages?: number
    confidentialite?: string
    lieuReception?: string
  },
  actor: Actor,
) {
  const document = await prisma.document.create({
    data: {
      organizationId: actor.organizationId,
      origine: 'TRACE',
      titre: input.titre,
      type: input.type,
      statut: 'DRAFT',
      reference: input.reference,
      organismeDeclare: input.organismeDeclare,
      dateIndiquee: input.dateIndiquee,
      nombrePages: input.nombrePages,
      confidentialite: input.confidentialite,
      lieuReception: input.lieuReception,
      createdByUserId: actor.id,
      currentHolderId: actor.id,
    },
  })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'TRACE_REGISTERED',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip: actor.ip,
  })

  return { dossierId: document.id }
}

export async function recordObservations(
  documentId: string,
  observations: {
    signaturePresente: boolean
    pagesCompletes: boolean
    cachetVisible: boolean
    documentLisible: boolean
    enveloppeIntacte: boolean
    anomalie?: string
  },
  actor: Actor,
) {
  await getOwnedTraceDocument(documentId, actor.organizationId)
  await prisma.document.update({ where: { id: documentId }, data: { observationsJson: observations } })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'TRACE_OBSERVATIONS_RECORDED',
    objectType: 'Document',
    objectId: documentId,
    documentId,
    ip: actor.ip,
  })

  return { success: true as const }
}

export async function captureArtifacts(documentId: string, files: Express.Multer.File[], actor: Actor) {
  await getOwnedTraceDocument(documentId, actor.organizationId)
  const existingCount = await prisma.artifact.count({ where: { documentId } })

  const created = await prisma.$transaction(
    files.map((file, index) =>
      prisma.artifact.create({ data: { documentId, path: file.path, pageIndex: existingCount + index } }),
    ),
  )

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'TRACE_CAPTURED',
    objectType: 'Document',
    objectId: documentId,
    documentId,
    ip: actor.ip,
  })

  const pageCount = existingCount + created.length
  return { artifactId: created[created.length - 1]!.id, pageCount }
}

export async function validateDocument(documentId: string, actor: Actor) {
  const document = await getOwnedTraceDocument(documentId, actor.organizationId)
  const trackingCode = generateTrackingCode('TRC')
  await transitionDocumentReceived(document.id, actor.organizationId, trackingCode, toAuditContext(actor))
  return { success: true as const, trackingCode, etiquetteUrl: `/api/trace/etiquette/${trackingCode}` }
}

export async function requestTransfer(documentId: string, input: { destinataireId: string; lieu?: string; motif?: string }, actor: Actor) {
  await getOwnedTraceDocument(documentId, actor.organizationId)

  const destinataire = await prisma.user.findFirst({ where: { id: input.destinataireId, organizationId: actor.organizationId } })
  if (!destinataire) throw ApiError.badRequest('UNKNOWN_DESTINATAIRE', 'Destinataire introuvable dans cette organisation.')

  const transfer = await prisma.transfer.create({
    data: {
      documentId,
      destinataireId: input.destinataireId,
      lieu: input.lieu,
      motif: input.motif,
      statut: 'PENDING',
      createdByUserId: actor.id,
    },
  })

  await transitionCustodyTransferRequested(documentId, actor.organizationId, toAuditContext(actor))
  return { transfertId: transfer.id, statut: 'PENDING' as const }
}

export async function confirmTransfer(transfertId: string, actor: Actor) {
  const transfer = await prisma.transfer.findUnique({ where: { id: transfertId }, include: { document: true } })
  if (!transfer || transfer.document.organizationId !== actor.organizationId) throw ApiError.notFound('Transfert introuvable.')
  if (transfer.destinataireId !== actor.id) throw ApiError.forbidden('Seul le destinataire désigné peut confirmer ce transfert.')
  if (transfer.statut !== 'PENDING') throw ApiError.conflict('TRANSFER_ALREADY_HANDLED', 'Ce transfert a déjà été traité.')

  await prisma.transfer.update({ where: { id: transfertId }, data: { statut: 'CONFIRMED', confirmedAt: new Date() } })
  await transitionCustodyTransferConfirmed(transfer.documentId, actor.organizationId, actor.id, toAuditContext(actor))
  return { success: true as const }
}

export async function reportIncident(
  documentId: string,
  input: { type: string; description: string; photoPath?: string },
  actor: Actor,
) {
  await getOwnedTraceDocument(documentId, actor.organizationId)

  const incident = await prisma.incident.create({
    data: {
      documentId,
      type: input.type,
      description: input.description,
      photoPath: input.photoPath,
      statut: 'INCIDENT_OPEN',
      createdByUserId: actor.id,
    },
  })

  // Action sensible visible dans l'audit interne complet — jamais de détail sur Verify (CLAUDE.md § Trace).
  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'INCIDENT_REPORTED',
    objectType: 'Incident',
    objectId: incident.id,
    documentId,
    ip: actor.ip,
  })

  return { incidentId: incident.id, statut: 'INCIDENT_OPEN' as const }
}

export async function getTimeline(documentId: string, organizationId: string) {
  await getOwnedTraceDocument(documentId, organizationId)
  const events = await prisma.auditEvent.findMany({ where: { documentId }, orderBy: { timestampServer: 'asc' } })
  return {
    evenements: events.map((e) => ({ type: e.action, acteur: e.actorLabel, date: e.timestampServer, details: e.objectType })),
  }
}

export async function archiveDocument(documentId: string, actor: Actor) {
  await getOwnedTraceDocument(documentId, actor.organizationId)
  await transitionDocumentArchived(documentId, actor.organizationId, toAuditContext(actor))
  return { success: true as const }
}
