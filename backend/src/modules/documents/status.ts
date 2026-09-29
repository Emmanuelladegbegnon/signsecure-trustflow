/**
 * Couche métier partagée pour les transitions de `Document.statut` et
 * `Document.custodyStatus` (CLAUDE.md § "Ce que Claude Code doit faire avant
 * de coder le backend") : aucun handler de route ne doit écrire ces deux
 * champs directement via prisma.document.update — toujours passer par une
 * fonction ci-dessous, qui vérifie la transition et écrit l'événement d'audit
 * correspondant dans la même opération logique.
 *
 * Les deux champs restent volontairement indépendants (CLAUDE.md § Trace) :
 * un dossier peut être SIGNED et avoir custodyStatus = TRANSFER_PENDING en
 * même temps.
 */
import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'

export const DocumentStatus = {
  // --- Sign ---
  DRAFT: 'DRAFT',
  PENDING_SIGNATURES: 'PENDING_SIGNATURES',
  SIGNED: 'SIGNED',
  REVOKED: 'REVOKED',
  // --- Trace ---
  RECEIVED: 'RECEIVED',
  ARCHIVED: 'ARCHIVED',
} as const
export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus]

export const CustodyStatus = {
  TRANSFER_PENDING: 'TRANSFER_PENDING',
} as const

export interface AuditContext {
  actorId: string | null
  actorLabel: string
  ip: string
  userAgent?: string | null
}

async function writeStatus(
  documentId: string,
  organizationId: string,
  data: Record<string, unknown>,
  ctx: AuditContext,
  action: string,
) {
  const document = await prisma.document.update({ where: { id: documentId }, data })
  await recordAuditEvent({
    organizationId,
    actorId: ctx.actorId,
    actorLabel: ctx.actorLabel,
    action,
    objectType: 'Document',
    objectId: documentId,
    documentId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })
  return document
}

// ------------------------------------------------------------------ Sign ---

/** DRAFT → PENDING_SIGNATURES, déclenché par POST /documents/:id/envoyer. */
export async function transitionDocumentSent(documentId: string, organizationId: string, ctx: AuditContext) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  if (document.statut !== DocumentStatus.DRAFT) {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', "Ce dossier n'est plus au stade brouillon.")
  }
  return writeStatus(documentId, organizationId, { statut: DocumentStatus.PENDING_SIGNATURES }, ctx, 'DOCUMENT_SENT')
}

/**
 * PENDING_SIGNATURES → SIGNED, uniquement quand tous les signataires ont
 * signé. Appelée par sign.service après embed de la signature + calcul du
 * hash — jamais avant que ces deux opérations aient réussi.
 */
export async function transitionDocumentSignedIfComplete(
  documentId: string,
  organizationId: string,
  data: {
    finalPdfPath: string
    hashSha256: string
    sealedAt: Date
    nombrePagesPdf: number
    tsaTokenPath?: string | null
    tsaGenTime?: Date | null
    tsaUrl?: string | null
  },
  ctx: AuditContext,
) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId }, include: { signataires: true } })
  const allSigned = document.signataires.every((s) => s.signedAt !== null)
  if (!allSigned) return document

  return writeStatus(documentId, organizationId, { statut: DocumentStatus.SIGNED, ...data }, ctx, 'DOCUMENT_SIGNED')
}

/** SIGNED → REVOKED, réservé au rôle Superviseur (vérifié dans la route). */
export async function transitionDocumentRevoked(
  documentId: string,
  organizationId: string,
  motif: string,
  ctx: AuditContext,
) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  if (document.statut !== DocumentStatus.SIGNED) {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Seul un dossier signé peut être révoqué.')
  }
  return writeStatus(
    documentId,
    organizationId,
    { statut: DocumentStatus.REVOKED, revocationMotif: motif, revokedAt: new Date(), revokedByUserId: ctx.actorId },
    ctx,
    'DOCUMENT_REVOKED',
  )
}

// ----------------------------------------------------------------- Trace ---

/** DRAFT → RECEIVED, déclenché par POST /trace/:id/valider (rôle Superviseur). */
export async function transitionDocumentReceived(
  documentId: string,
  organizationId: string,
  trackingCode: string,
  ctx: AuditContext,
) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  if (document.statut !== DocumentStatus.DRAFT) {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', "Ce dossier n'est plus au stade brouillon.")
  }
  return writeStatus(documentId, organizationId, { statut: DocumentStatus.RECEIVED, trackingCode }, ctx, 'DOCUMENT_RECEIVED')
}

/** RECEIVED → ARCHIVED, déclenché par POST /trace/:id/archiver. */
export async function transitionDocumentArchived(documentId: string, organizationId: string, ctx: AuditContext) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  if (document.statut !== DocumentStatus.RECEIVED) {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Seul un dossier reçu peut être archivé.')
  }
  return writeStatus(documentId, organizationId, { statut: DocumentStatus.ARCHIVED }, ctx, 'DOCUMENT_ARCHIVED')
}

/** custodyStatus: null → TRANSFER_PENDING, déclenché par POST /trace/:id/transfert. */
export async function transitionCustodyTransferRequested(documentId: string, organizationId: string, ctx: AuditContext) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  if (document.custodyStatus === CustodyStatus.TRANSFER_PENDING) {
    throw ApiError.conflict('TRANSFER_ALREADY_PENDING', 'Un transfert est déjà en attente pour ce dossier.')
  }
  return writeStatus(
    documentId,
    organizationId,
    { custodyStatus: CustodyStatus.TRANSFER_PENDING },
    ctx,
    'TRANSFER_REQUESTED',
  )
}

/** custodyStatus: TRANSFER_PENDING → null, détenteur mis à jour, déclenché par POST /trace/transfert/:id/confirmer. */
export async function transitionCustodyTransferConfirmed(
  documentId: string,
  organizationId: string,
  newHolderId: string,
  ctx: AuditContext,
) {
  return writeStatus(
    documentId,
    organizationId,
    { custodyStatus: null, currentHolderId: newHolderId },
    ctx,
    'TRANSFER_CONFIRMED',
  )
}
