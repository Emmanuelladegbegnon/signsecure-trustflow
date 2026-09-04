import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { generateTrackingCode } from '../../lib/trackingCode.js'
import { sendEmail } from '../../lib/notify.js'
import { generateOtpCode, hashOtpCode, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '../../lib/otp.js'
import { getOtpProvider } from '../../lib/otpProvider.js'
import { stashPendingSignature, takePendingSignature } from '../../lib/pendingSignatures.js'
import { documentsDir } from '../../lib/storage.js'
import { embedSignatureInPdf } from './pdf.js'
import {
  transitionDocumentRevoked,
  transitionDocumentSent,
  transitionDocumentSignedIfComplete,
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

export async function createDocument(
  file: Express.Multer.File,
  titre: string,
  type: string,
  actor: Actor,
) {
  const trackingCode = generateTrackingCode('SGN')
  const document = await prisma.document.create({
    data: {
      organizationId: actor.organizationId,
      origine: 'SIGN',
      titre,
      type,
      statut: 'DRAFT',
      trackingCode,
      fichierPath: file.path,
      createdByUserId: actor.id,
    },
  })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'DOCUMENT_CREATED',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip: actor.ip,
  })

  return { dossierId: document.id, trackingCode }
}

async function getOwnedSignDocument(documentId: string, organizationId: string) {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId, origine: 'SIGN' } })
  if (!document) throw ApiError.notFound('Dossier introuvable.')
  return document
}

export async function assignSignatories(
  documentId: string,
  signataires: Array<{ nom: string; email: string; telephone: string; zone: { page: number; x: number; y: number } }>,
  actor: Actor,
) {
  const document = await getOwnedSignDocument(documentId, actor.organizationId)
  if (document.statut !== 'DRAFT') {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Les signataires ne peuvent être modifiés que pour un dossier brouillon.')
  }

  const created = await prisma.$transaction(
    signataires.map((s, index) =>
      prisma.signatory.create({
        data: {
          documentId,
          nom: s.nom,
          email: s.email,
          telephone: s.telephone,
          zonePage: s.zone.page,
          zoneX: s.zone.x,
          zoneY: s.zone.y,
          ordre: index,
        },
      }),
    ),
  )

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'SIGNATORIES_ASSIGNED',
    objectType: 'Document',
    objectId: documentId,
    documentId,
    ip: actor.ip,
  })

  return { success: true as const, transactionsCreated: created.map((s) => s.id) }
}

export async function sendDocument(documentId: string, actor: Actor) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId: actor.organizationId, origine: 'SIGN' },
    include: { signataires: true },
  })
  if (!document) throw ApiError.notFound('Dossier introuvable.')
  if (document.signataires.length === 0) {
    throw ApiError.badRequest('NO_SIGNATORIES', "Aucun signataire n'est assigné à ce dossier.")
  }

  const expiresAt = new Date(Date.now() + env.signerLinkExpiryHours * 3_600_000)
  await prisma.$transaction(
    document.signataires.map((s) =>
      prisma.signatory.update({ where: { id: s.id }, data: { linkToken: randomUUID(), linkExpiresAt: expiresAt } }),
    ),
  )

  const refreshed = await prisma.signatory.findMany({ where: { documentId } })
  await Promise.all(
    refreshed.map((s) =>
      sendEmail(
        s.email,
        `Signature requise : ${document.titre}`,
        `Bonjour ${s.nom},\n\nVous êtes invité(e) à signer le document « ${document.titre} ».\nLien (valable 48h) : ${env.frontendBaseUrl}/signer/${s.linkToken}\n\nCe lien est personnel et à usage unique.`,
      ),
    ),
  )

  await transitionDocumentSent(documentId, actor.organizationId, toAuditContext(actor))
  return { success: true as const }
}

async function getSignatoryByToken(token: string) {
  const signatory = await prisma.signatory.findUnique({ where: { linkToken: token }, include: { document: true } })
  if (!signatory || !signatory.linkExpiresAt || signatory.linkExpiresAt < new Date() || signatory.linkUsedAt) {
    throw ApiError.gone()
  }
  if (signatory.document.statut === 'REVOKED') throw ApiError.gone('Ce dossier a été révoqué.')
  return signatory
}

export async function getLinkInfo(token: string) {
  const signatory = await getSignatoryByToken(token)
  return {
    dossier: { titre: signatory.document.titre, type: signatory.document.type, page: signatory.zonePage },
    pdfUrl: `/api/sign/link/${token}/fichier`,
    zoneSignature: { page: signatory.zonePage, x: signatory.zoneX, y: signatory.zoneY },
  }
}

export async function getLinkFilePath(token: string): Promise<string> {
  const signatory = await getSignatoryByToken(token)
  const filePath = signatory.document.finalPdfPath ?? signatory.document.fichierPath
  if (!filePath) throw ApiError.notFound('Fichier introuvable.')
  return filePath
}

export async function applySignature(token: string, signatureImageBase64: string, ip: string) {
  const signatory = await getSignatoryByToken(token)

  stashPendingSignature(signatory.id, signatureImageBase64)
  await prisma.signatory.update({ where: { id: signatory.id }, data: { consentedAt: new Date(), ipAddress: ip } })

  const code = generateOtpCode()
  const now = new Date()
  await prisma.otpChallenge.create({
    data: {
      purpose: 'SIGNATURE',
      signatoryId: signatory.id,
      codeHash: hashOtpCode(code),
      channel: 'email',
      expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
      nextResendAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
    },
  })
  await getOtpProvider().send({ channel: 'email', destination: signatory.email, code })

  await recordAuditEvent({
    organizationId: signatory.document.organizationId,
    actorId: null,
    actorLabel: `Signataire ${signatory.nom}`,
    action: 'SIGNATURE_INITIATED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip,
  })

  return { otpRequired: true as const }
}

export async function verifySignatureOtp(token: string, code: string, ip: string) {
  const signatory = await getSignatoryByToken(token)
  const invalidOtp = () => ApiError.unauthorized('Code invalide ou expiré.')

  const challenge = await prisma.otpChallenge.findFirst({
    where: { signatoryId: signatory.id, purpose: 'SIGNATURE', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) throw invalidOtp()
  if (challenge.codeHash !== hashOtpCode(code)) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } })
    throw invalidOtp()
  }

  const imageBase64 = takePendingSignature(signatory.id)
  if (!imageBase64) {
    throw ApiError.gone('La signature a expiré, veuillez recommencer le dessin.')
  }

  const document = signatory.document
  const sourcePath = document.finalPdfPath ?? document.fichierPath
  if (!sourcePath) throw ApiError.internal('Document source introuvable.')
  const destPath = path.join(documentsDir, `${document.id}-signe.pdf`)

  const { hashSha256 } = await embedSignatureInPdf(
    sourcePath,
    destPath,
    { page: signatory.zonePage, x: signatory.zoneX, y: signatory.zoneY },
    imageBase64,
  )

  await prisma.$transaction([
    prisma.signatory.update({
      where: { id: signatory.id },
      data: { signedAt: new Date(), linkUsedAt: new Date(), methode: 'manuscrite', ipAddress: ip },
    }),
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.document.update({ where: { id: document.id }, data: { finalPdfPath: destPath, hashSha256 } }),
  ])

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: `Signataire ${signatory.nom}`,
    action: 'SIGNATORY_SIGNED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: document.id,
    ip,
  })

  await transitionDocumentSignedIfComplete(
    document.id,
    document.organizationId,
    { finalPdfPath: destPath, hashSha256 },
    { actorId: null, actorLabel: `Signataire ${signatory.nom}`, ip },
  )

  return { success: true as const, dossierId: document.id, trackingCode: document.trackingCode! }
}

export async function getProofReport(documentId: string, organizationId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId, origine: 'SIGN' },
    include: { signataires: true },
  })
  if (!document) throw ApiError.notFound('Dossier introuvable.')

  const events = await prisma.auditEvent.findMany({
    where: { documentId },
    orderBy: { timestampServer: 'asc' },
  })

  return {
    signataires: document.signataires.map((s) => ({
      nom: s.nom,
      email: s.email,
      signe: s.signedAt !== null,
      dateSignature: s.signedAt,
      methode: s.methode,
    })),
    timeline: events.map((e) => ({ type: e.action, acteur: e.actorLabel, date: e.timestampServer, details: e.objectType })),
    hash: document.hashSha256,
    disclaimer:
      'Ce rapport reflète les contrôles techniques effectués par la plateforme (correspondance de hash, horodatage serveur, journal d\'audit chaîné) et ne remplace pas une expertise judiciaire.',
  }
}

export async function revokeDocument(documentId: string, motif: string, actor: Actor) {
  const document = await getOwnedSignDocument(documentId, actor.organizationId)
  void document
  return transitionDocumentRevoked(documentId, actor.organizationId, motif, toAuditContext(actor))
}

/**
 * GET /api/documents — non spécifique à Sign : le frontend Trace réutilise ce
 * même endpoint et filtre côté client sur `origine` (pas d'endpoint de liste
 * dédié dans API_CONTRACT.md § Trace).
 */
export async function listDocuments(
  organizationId: string,
  filters: { statut?: string; type?: string; date?: string },
) {
  const documents = await prisma.document.findMany({
    where: {
      organizationId,
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.date ? { createdAt: { gte: new Date(`${filters.date}T00:00:00`), lt: new Date(`${filters.date}T23:59:59`) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    dossiers: documents.map((d) => ({
      id: d.id,
      trackingCode: d.trackingCode,
      titre: d.titre,
      statut: d.statut,
      origine: d.origine,
      date: d.createdAt,
    })),
  }
}
