import type { Actor } from '../../lib/actor.js'
import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { generateTrackingCode } from '../../lib/trackingCode.js'
import { comparisonsDir, incidentsDir, storeUploadedFile, traceDir } from '../../lib/storage.js'
import { storeSanitizedImage } from '../../lib/imageSanitizer.js'
import {
  transitionCustodyTransferConfirmed,
  transitionCustodyTransferRequested,
  transitionDocumentArchived,
  transitionDocumentReceived,
  type AuditContext,
} from '../documents/status.js'


function toAuditContext(actor: Actor): AuditContext {
  return { actorId: actor.id, actorLabel: actor.label, ip: actor.ip, userAgent: actor.userAgent }
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
    userAgent: actor.userAgent,
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
    userAgent: actor.userAgent,
  })

  return { success: true as const }
}

/**
 * Photos de référence capturées à la réception. Pour chaque photo, le serveur
 * calcule l'empreinte SHA-256 des octets reçus et l'inscrit au journal chaîné
 * (TRACE_PHOTO_CAPTURED) : toute substitution ultérieure du fichier devient
 * détectable. L'horodatage est celui du serveur, jamais celui du téléphone.
 */
export async function captureArtifacts(documentId: string, files: Express.Multer.File[], actor: Actor) {
  const document = await getOwnedTraceDocument(documentId, actor.organizationId)
  if (document.statut !== 'DRAFT') {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Les photos de référence ne peuvent plus être modifiées après validation.')
  }
  const existingCount = await prisma.artifact.count({ where: { documentId } })

  const created = []
  for (const [index, file] of files.entries()) {
    const stored = await storeSanitizedImage(traceDir, file)
    const artifact = await prisma.artifact.create({
      data: {
        documentId,
        path: stored.path,
        pageIndex: existingCount + index,
        sha256: stored.sha256,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    })
    created.push(artifact)
    await recordAuditEvent({
      organizationId: actor.organizationId,
      actorId: actor.id,
      actorLabel: actor.label,
      action: 'TRACE_PHOTO_CAPTURED',
      objectType: 'Artifact',
      objectId: artifact.id,
      documentId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      details: {
        page: artifact.pageIndex + 1,
        sha256: stored.sha256,
        sha256Recu: stored.sha256Recu,
        metadonneesSupprimees: stored.metadonneesSupprimees,
        octets: stored.sizeBytes,
      },
    })
  }

  const pageCount = existingCount + created.length
  return {
    artifactId: created[created.length - 1]!.id,
    pageCount,
    empreintes: created.map((a) => ({ page: a.pageIndex + 1, sha256: a.sha256 })),
  }
}

export async function validateDocument(documentId: string, actor: Actor) {
  const document = await getOwnedTraceDocument(documentId, actor.organizationId)
  // Parade au remplacement de pages après enregistrement : une photo par page déclarée.
  const photoCount = await prisma.artifact.count({ where: { documentId } })
  const expected = Math.max(document.nombrePages ?? 1, 1)
  if (photoCount < expected) {
    throw ApiError.badRequest(
      'PAGES_MISSING_PHOTOS',
      `Photographiez chaque page avant validation : ${photoCount} photo(s) pour ${expected} page(s) déclarée(s).`,
    )
  }
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
  input: { type: string; description: string; photo?: Express.Multer.File },
  actor: Actor,
) {
  await getOwnedTraceDocument(documentId, actor.organizationId)
  const photo = input.photo ? await storeSanitizedImage(incidentsDir, input.photo) : null

  const incident = await prisma.incident.create({
    data: {
      documentId,
      type: input.type,
      description: input.description,
      photoPath: photo?.path,
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
    userAgent: actor.userAgent,
    details: { type: input.type, ...(photo ? { sha256Photo: photo.sha256 } : {}) },
  })

  return { incidentId: incident.id, statut: 'INCIDENT_OPEN' as const }
}

/**
 * Photos/scans de référence capturés à la réception — éléments constitutifs
 * du dossier de preuve (CLAUDE.md § Trace). Jamais de chemin de stockage
 * exposé au client : la liste ne renvoie que des URLs vers l'endpoint
 * authentifié GET /api/trace/photos/:artifactId.
 */
export async function listArtifacts(documentId: string, organizationId: string) {
  await getOwnedTraceDocument(documentId, organizationId)
  const artifacts = await prisma.artifact.findMany({ where: { documentId }, orderBy: { pageIndex: 'asc' } })
  return {
    photos: artifacts.map((a) => ({
      id: a.id,
      pageIndex: a.pageIndex,
      url: `/api/trace/photos/${a.id}`,
      sha256: a.sha256,
      dateCapture: a.createdAt,
    })),
  }
}

export async function getArtifactFile(artifactId: string, organizationId: string) {
  const artifact = await prisma.artifact.findFirst({
    where: { id: artifactId, document: { organizationId } },
  })
  if (!artifact) throw ApiError.notFound('Photo introuvable.')
  return { path: artifact.path, mimeType: artifact.mimeType ?? undefined }
}

// ------------------------------------------------ Examen de concordance ---

/**
 * Conclusions possibles d'un examen humain. Jamais de verdict d'identité : on
 * enregistre ce qu'une personne a constaté en comparant visuellement.
 */
export const COMPARISON_CONCLUSIONS = ['CONCORDANCE_CONSTATEE', 'DIVERGENCES_CONSTATEES', 'EXAMEN_NON_CONCLUANT'] as const
export type ComparisonConclusion = (typeof COMPARISON_CONCLUSIONS)[number]

/**
 * Un Vérificateur ou Superviseur compare côte à côte une copie présentée
 * (photo ou scan) aux photos de référence, puis enregistre son jugement,
 * horodaté côté serveur et inscrit au journal chaîné avec l'empreinte de la
 * copie examinée (CLAUDE.md § Verify : aucun hash exact ni verdict binaire
 * automatique sur une photo).
 */
export async function recordComparison(
  documentId: string,
  file: Express.Multer.File,
  input: { conclusion: ComparisonConclusion; commentaire: string },
  actor: Actor,
) {
  await getOwnedTraceDocument(documentId, actor.organizationId)
  // Copie examinée : une image est nettoyée de ses métadonnées, un PDF est gardé tel quel.
  const stored = file.mimetype === 'application/pdf' ? await storeUploadedFile(comparisonsDir, file) : await storeSanitizedImage(comparisonsDir, file)
  const comparison = await prisma.traceComparison.create({
    data: {
      documentId,
      reviewerId: actor.id,
      submittedPath: stored.path,
      submittedSha256: stored.sha256,
      mimeType: stored.mimeType,
      conclusion: input.conclusion,
      commentaire: input.commentaire,
    },
  })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'TRACE_COMPARISON_RECORDED',
    objectType: 'TraceComparison',
    objectId: comparison.id,
    documentId,
    ip: actor.ip,
    userAgent: actor.userAgent,
    details: { conclusion: input.conclusion, sha256CopieExaminee: stored.sha256 },
  })

  return { comparaisonId: comparison.id, conclusion: comparison.conclusion, date: comparison.createdAt }
}

export async function listComparisons(documentId: string, organizationId: string) {
  await getOwnedTraceDocument(documentId, organizationId)
  const comparisons = await prisma.traceComparison.findMany({
    where: { documentId },
    include: { reviewer: true },
    orderBy: { createdAt: 'desc' },
  })
  return {
    comparaisons: comparisons.map((c) => ({
      id: c.id,
      conclusion: c.conclusion,
      commentaire: c.commentaire,
      examinateur: `${c.reviewer.prenom} ${c.reviewer.nom}`,
      date: c.createdAt,
      sha256CopieExaminee: c.submittedSha256,
      url: `/api/trace/comparaisons/${c.id}/fichier`,
      mimeType: c.mimeType,
    })),
  }
}

export async function getComparisonFile(comparisonId: string, organizationId: string) {
  const comparison = await prisma.traceComparison.findFirst({ where: { id: comparisonId, document: { organizationId } } })
  if (!comparison) throw ApiError.notFound('Examen introuvable.')
  return { path: comparison.submittedPath, mimeType: comparison.mimeType }
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
