import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { Actor } from '../../lib/actor.js'
import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent, verifyAuditChain } from '../../lib/audit.js'
import { generateTrackingCode } from '../../lib/trackingCode.js'
import { sendEmail } from '../../lib/notify.js'
import { generateOtpCode, hashOtpCode, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from '../../lib/otp.js'
import { getOtpProvider, isSmsSimulated, type OtpChannel } from '../../lib/otpProvider.js'
import { hasPendingSignature, stashPendingSignature, takePendingSignature } from '../../lib/pendingSignatures.js'
import { maskEmail, maskPhone, normalizePhone } from '../../lib/phone.js'
import { withKeyedLock } from '../../lib/keyedLock.js'
import { requestTimestamp } from '../../lib/tsa.js'
import { documentsDir, readStoredFile, sha256Hex, storeUploadedFile, timestampsDir, writeStoredFile } from '../../lib/storage.js'
import { countPdfPages, embedSignature, finalizeSignedPdf } from './pdf.js'
import { getSealCertificateInfo, registerSealCertificate } from '../../lib/pdfSeal.js'
import {
  transitionDocumentRevoked,
  transitionDocumentSent,
  transitionDocumentSignedIfComplete,
  type AuditContext,
} from '../documents/status.js'

export interface RequestMeta {
  ip: string
  userAgent?: string | null
}

/** Mention portée dans le rapport de preuve : SignSecure ne vérifie pas l'identité réelle (pas d'eKYC). */
export const DECLARED_IDENTITY_NOTICE = "Identité déclarée par l'émetteur du dossier, non vérifiée par SignSecure."

function toAuditContext(actor: Actor): AuditContext {
  return { actorId: actor.id, actorLabel: actor.label, ip: actor.ip, userAgent: actor.userAgent }
}

/** Nombre maximal de codes émis (envoi initial + renvois) par signataire. */
const MAX_SIGNATURE_OTP_ISSUANCES = 5

/** Canaux OTP exigés pour valider une signature : SMS toujours, email en plus si le document est sensible. */
function requiredOtpChannels(sensible: boolean): OtpChannel[] {
  return sensible ? ['sms', 'email'] : ['sms']
}

export async function createDocument(
  file: Express.Multer.File,
  input: { titre: string; type: string; sensible: boolean },
  actor: Actor,
) {
  let nombrePagesPdf: number
  try {
    nombrePagesPdf = await countPdfPages(file.buffer)
  } catch {
    throw ApiError.badRequest('INVALID_PDF', "Le fichier n'est pas un PDF lisible.")
  }

  const stored = await storeUploadedFile(documentsDir, file)
  const trackingCode = generateTrackingCode('SGN')
  const document = await prisma.document.create({
    data: {
      organizationId: actor.organizationId,
      origine: 'SIGN',
      titre: input.titre,
      type: input.type,
      sensible: input.sensible,
      statut: 'DRAFT',
      trackingCode,
      fichierPath: stored.path,
      originalHashSha256: stored.sha256,
      nombrePagesPdf,
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
    userAgent: actor.userAgent,
    details: { sha256Original: stored.sha256, pages: nombrePagesPdf, sensible: input.sensible },
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

  // Parade au « faux signataire » : l'émetteur ne peut pas se désigner comme
  // signataire externe avec ses propres coordonnées (il recevrait lien ET
  // code). Pour signer soi-même, passer par « Signer maintenant ».
  const issuer = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })
  const issuerPhone = normalizePhone(issuer.telephone)
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()

  const normalized = signataires.map((s) => {
    const email = s.email.trim().toLowerCase()
    const telephone = normalizePhone(s.telephone)
    if (!telephone) {
      throw ApiError.badRequest('INVALID_PHONE', `Numéro de téléphone invalide pour ${s.nom} : un numéro joignable par SMS est requis.`)
    }
    if (email === issuer.email.toLowerCase() || (issuerPhone && telephone === issuerPhone)) {
      throw ApiError.badRequest(
        'SIGNER_IS_ISSUER',
        `Le signataire ${s.nom} utilise votre propre email ou numéro. Pour signer vous-même, utilisez « Signer maintenant ».`,
      )
    }
    if (seenEmails.has(email) || seenPhones.has(telephone)) {
      throw ApiError.badRequest('DUPLICATE_SIGNER', 'Deux signataires ne peuvent pas partager le même email ou le même numéro.')
    }
    seenEmails.add(email)
    seenPhones.add(telephone)
    return { ...s, email, telephone }
  })

  const created = await prisma.$transaction(
    normalized.map((s, index) =>
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
    userAgent: actor.userAgent,
    details: { signataires: created.length },
  })

  return { success: true as const, transactionsCreated: created.map((s) => s.id) }
}

/**
 * Signature "dans l'appli" pour le compte déjà authentifié qui a préparé le
 * dossier (ou tout compte de l'organisation ajouté comme signataire) : évite
 * l'aller-retour par email pour sa propre signature — au lieu d'attendre un
 * clic sur un lien reçu, on délivre le linkToken immédiatement et le front
 * enchaîne directement sur le parcours /signer/:token existant (dessin +
 * consentement + OTP restent inchangés, CLAUDE.md § Sign — seule la
 * *délivrance* du lien change, pas la cérémonie de signature elle-même).
 *
 * Nom/email/téléphone viennent du compte en base, jamais du client — seule la
 * position de la zone est une donnée client légitime ici (même confiance que
 * POST /:id/signataires).
 */
export async function startOwnSignature(
  documentId: string,
  actor: Actor,
  zone: { page: number; x: number; y: number },
) {
  const document = await getOwnedSignDocument(documentId, actor.organizationId)
  if (document.statut !== 'DRAFT' && document.statut !== 'PENDING_SIGNATURES') {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', 'Ce dossier ne peut plus recevoir de nouvelle signature.')
  }

  const account = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })
  const telephone = normalizePhone(account.telephone)
  if (!telephone) {
    throw ApiError.badRequest('INVALID_PHONE', "Le numéro de téléphone de votre compte est invalide : demandez à un administrateur de le corriger (requis pour le code SMS).")
  }

  const existing = await prisma.signatory.findFirst({ where: { documentId, email: account.email } })
  if (existing?.signedAt) {
    throw ApiError.conflict('ALREADY_SIGNED', 'Vous avez déjà signé ce document.')
  }

  const linkToken = randomUUID()
  const linkExpiresAt = new Date(Date.now() + env.signerLinkExpiryHours * 3_600_000)
  const nom = `${account.prenom} ${account.nom}`.trim()

  const signatory = existing
    ? await prisma.signatory.update({
        where: { id: existing.id },
        data: { nom, telephone, zonePage: zone.page, zoneX: zone.x, zoneY: zone.y, linkToken, linkExpiresAt },
      })
    : await prisma.signatory.create({
        data: {
          documentId,
          nom,
          email: account.email,
          telephone,
          zonePage: zone.page,
          zoneX: zone.x,
          zoneY: zone.y,
          ordre: await prisma.signatory.count({ where: { documentId } }),
          linkToken,
          linkExpiresAt,
        },
      })

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'OWN_SIGNATURE_STARTED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  })

  return { token: linkToken }
}

function signatureRequestEmail(signatory: { nom: string; telephone: string; linkToken: string | null }, titre: string, reminder = false) {
  const intro = reminder
    ? `Rappel : votre signature est toujours attendue sur le document « ${titre} ». Le lien expire bientôt.`
    : `Vous êtes invité(e) à signer le document « ${titre} ».`
  return (
    `Bonjour ${signatory.nom},\n\n${intro}\n` +
    `Lien (valable ${env.signerLinkExpiryHours} h au total) : ${env.frontendBaseUrl}/signer/${signatory.linkToken}\n\n` +
    `Pour valider votre signature, un code vous sera envoyé par SMS au ${maskPhone(signatory.telephone)}.\n` +
    `Ce lien est personnel et à usage unique. SignSecure ne vous demandera jamais ce code par téléphone ou par email.`
  )
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
      prisma.signatory.update({ where: { id: s.id }, data: { linkToken: randomUUID(), linkExpiresAt: expiresAt, reminderSentAt: null } }),
    ),
  )

  const refreshed = await prisma.signatory.findMany({ where: { documentId } })
  await Promise.all(refreshed.map((s) => sendEmail(s.email, `Signature requise : ${document.titre}`, signatureRequestEmail(s, document.titre))))

  await transitionDocumentSent(documentId, actor.organizationId, toAuditContext(actor))
  return { success: true as const }
}

/**
 * Relance automatique (tâche planifiée) : un email par signataire, une seule
 * fois par lien, quand il reste moins de SIGNER_REMINDER_HOURS_BEFORE_EXPIRY
 * heures avant l'expiration.
 */
export async function sendSignatureReminders(now = new Date()) {
  const threshold = new Date(now.getTime() + env.signerReminderHoursBeforeExpiry * 3_600_000)
  const due = await prisma.signatory.findMany({
    where: {
      signedAt: null,
      linkUsedAt: null,
      reminderSentAt: null,
      linkToken: { not: null },
      linkExpiresAt: { gt: now, lte: threshold },
      document: { statut: 'PENDING_SIGNATURES' },
    },
    include: { document: true },
  })

  for (const s of due) {
    await sendEmail(s.email, `Rappel — signature attendue : ${s.document.titre}`, signatureRequestEmail(s, s.document.titre, true))
    await prisma.signatory.update({ where: { id: s.id }, data: { reminderSentAt: now } })
    await recordAuditEvent({
      organizationId: s.document.organizationId,
      actorId: null,
      actorLabel: 'Système (relance automatique)',
      action: 'SIGNATURE_REMINDER_SENT',
      objectType: 'Signatory',
      objectId: s.id,
      documentId: s.documentId,
      ip: 'system',
    })
  }
  return { relances: due.length }
}

async function getSignatoryByToken(token: string) {
  const signatory = await prisma.signatory.findUnique({ where: { linkToken: token }, include: { document: true } })
  if (!signatory || !signatory.linkExpiresAt || signatory.linkExpiresAt < new Date() || signatory.linkUsedAt) {
    throw ApiError.gone()
  }
  if (signatory.document.statut === 'REVOKED') throw ApiError.gone('Ce dossier a été révoqué.')
  return signatory
}

function otpDestinations(signatory: { telephone: string; email: string }, channels: OtpChannel[]) {
  return channels.map((canal) => ({
    canal,
    destination: canal === 'sms' ? maskPhone(signatory.telephone) : maskEmail(signatory.email),
  }))
}

export async function getLinkInfo(token: string) {
  const signatory = await getSignatoryByToken(token)
  const channels = requiredOtpChannels(signatory.document.sensible)
  return {
    dossier: { titre: signatory.document.titre, type: signatory.document.type, page: signatory.zonePage },
    pdfUrl: `/api/sign/link/${token}/fichier`,
    zoneSignature: { page: signatory.zonePage, x: signatory.zoneX, y: signatory.zoneY },
    otp: { canaux: otpDestinations(signatory, channels), smsSimulation: isSmsSimulated() },
  }
}

export async function getLinkFilePath(token: string): Promise<string> {
  const signatory = await getSignatoryByToken(token)
  const filePath = signatory.document.finalPdfPath ?? signatory.document.fichierPath
  if (!filePath) throw ApiError.notFound('Fichier introuvable.')
  return filePath
}

/** Émet un code par canal requis. Les codes précédents encore actifs sont invalidés. */
async function issueSignatureOtps(signatory: { id: string; telephone: string; email: string }, channels: OtpChannel[]) {
  const now = new Date()
  await prisma.otpChallenge.updateMany({
    where: { signatoryId: signatory.id, purpose: 'SIGNATURE', consumedAt: null },
    data: { expiresAt: now },
  })
  for (const channel of channels) {
    const code = generateOtpCode()
    await prisma.otpChallenge.create({
      data: {
        purpose: 'SIGNATURE',
        signatoryId: signatory.id,
        codeHash: hashOtpCode(code),
        channel,
        expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
        nextResendAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
      },
    })
    await getOtpProvider().send({
      channel,
      destination: channel === 'sms' ? signatory.telephone : signatory.email,
      code,
      purpose: 'signature',
    })
  }
}

export async function applySignature(token: string, signatureImageBase64: string, meta: RequestMeta) {
  const signatory = await getSignatoryByToken(token)
  const channels = requiredOtpChannels(signatory.document.sensible)

  stashPendingSignature(signatory.id, signatureImageBase64)
  const consentedAt = new Date()
  await prisma.signatory.update({
    where: { id: signatory.id },
    data: { consentedAt, ipAddress: meta.ip, userAgent: meta.userAgent ?? null },
  })

  await issueSignatureOtps(signatory, channels)

  // Consentement journalisé séparément de la validation finale (deux horodatages distincts).
  await recordAuditEvent({
    organizationId: signatory.document.organizationId,
    actorId: null,
    actorLabel: `Signataire ${signatory.nom}`,
    action: 'SIGNATURE_CONSENT_RECORDED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: { canauxOtp: channels, smsSimulation: isSmsSimulated() },
  })

  return { otpRequired: true as const, canaux: otpDestinations(signatory, channels), smsSimulation: isSmsSimulated() }
}

export async function resendSignatureOtp(token: string, meta: RequestMeta) {
  const signatory = await getSignatoryByToken(token)
  if (!hasPendingSignature(signatory.id)) {
    throw ApiError.gone('La signature a expiré, veuillez recommencer le dessin.')
  }
  const last = await prisma.otpChallenge.findFirst({
    where: { signatoryId: signatory.id, purpose: 'SIGNATURE' },
    orderBy: { createdAt: 'desc' },
  })
  if (last && last.nextResendAt > new Date()) {
    throw ApiError.conflict('RESEND_TOO_SOON', 'Veuillez patienter avant de redemander un code.')
  }
  // Chaque renvoi redonne OTP_MAX_ATTEMPTS essais : plafonner les renvois borne
  // le nombre total d'essais possibles sur un même lien.
  const issued = await prisma.otpChallenge.count({ where: { signatoryId: signatory.id, purpose: 'SIGNATURE', channel: 'sms' } })
  if (issued >= MAX_SIGNATURE_OTP_ISSUANCES) {
    throw ApiError.conflict('TOO_MANY_CODES', "Nombre maximal de codes atteint pour ce lien. Contactez l'émetteur du document.")
  }

  const channels = requiredOtpChannels(signatory.document.sensible)
  await issueSignatureOtps(signatory, channels)
  await recordAuditEvent({
    organizationId: signatory.document.organizationId,
    actorId: null,
    actorLabel: `Signataire ${signatory.nom}`,
    action: 'SIGNATURE_OTP_RESENT',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  })
  return {
    success: true as const,
    canaux: otpDestinations(signatory, channels),
    nextResendAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString(),
  }
}

/** Vérifie les codes de tous les canaux requis ; tout échec incrémente le compteur d'essais du canal concerné. */
async function checkSignatureOtps(signatoryId: string, channels: OtpChannel[], codes: Record<OtpChannel, string | undefined>) {
  const invalidOtp = () => ApiError.unauthorized('Code invalide ou expiré.')
  const challenges = []
  for (const channel of channels) {
    const challenge = await prisma.otpChallenge.findFirst({
      where: { signatoryId, purpose: 'SIGNATURE', channel, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) throw invalidOtp()
    const code = codes[channel]
    if (!code || challenge.codeHash !== hashOtpCode(code)) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } })
      throw channels.length > 1
        ? ApiError.unauthorized(`Code ${channel === 'sms' ? 'SMS' : 'email'} invalide ou expiré.`)
        : invalidOtp()
    }
    challenges.push(challenge)
  }
  return challenges
}

export async function verifySignatureOtp(token: string, codes: { code: string; codeEmail?: string }, meta: RequestMeta) {
  const signatory = await getSignatoryByToken(token)
  const channels = requiredOtpChannels(signatory.document.sensible)
  const challenges = await checkSignatureOtps(signatory.id, channels, { sms: codes.code, email: codes.codeEmail })

  const imageBase64 = takePendingSignature(signatory.id)
  if (!imageBase64) {
    throw ApiError.gone('La signature a expiré, veuillez recommencer le dessin.')
  }

  // Une signature à la fois par document : chacune part de la dernière version.
  return withKeyedLock(`sign:${signatory.documentId}`, async () => {
    const document = await prisma.document.findUniqueOrThrow({ where: { id: signatory.documentId }, include: { signataires: true } })
    const sourcePath = document.finalPdfPath ?? document.fichierPath
    if (!sourcePath) throw ApiError.internal('Document source introuvable.')

    // Toute signature produit une NOUVELLE version : la précédente n'est jamais modifiée.
    const alreadySigned = document.signataires.filter((s) => s.signedAt !== null).length
    const version = alreadySigned + 1
    const isLast = document.signataires.every((s) => s.id === signatory.id || s.signedAt !== null)

    const signedBytes = await embedSignature(
      await readStoredFile(sourcePath),
      { page: signatory.zonePage, x: signatory.zoneX, y: signatory.zoneY },
      imageBase64,
      signatory.ordre,
    )

    const signedAt = new Date()
    const auditCtx = { actorId: null, actorLabel: `Signataire ${signatory.nom}`, ip: meta.ip, userAgent: meta.userAgent }

    let versionPath: string
    let versionHash: string
    let finalData: Parameters<typeof transitionDocumentSignedIfComplete>[2] | null = null

    if (isLast) {
      await registerSealCertificate()
      const final = await finalizeSignedPdf(signedBytes, document.trackingCode!, signedAt)
      versionPath = path.join(documentsDir, `${document.id}-v${version}-final.pdf`)
      versionHash = final.hashSha256
      await writeStoredFile(versionPath, final.bytes)

      const timestamp = await requestTimestamp(final.hashSha256)
      let tsaTokenPath: string | null = null
      if (timestamp) {
        tsaTokenPath = path.join(timestampsDir, `${document.id}.tsr`)
        await writeFile(tsaTokenPath, timestamp.der) // jeton public, vérifiable avec openssl ts -verify
      }
      finalData = {
        finalPdfPath: versionPath,
        hashSha256: final.hashSha256,
        sealedAt: signedAt,
        sealCertFingerprint: getSealCertificateInfo().empreinteSha256,
        nombrePagesPdf: final.pageCount,
        tsaTokenPath,
        tsaGenTime: timestamp?.genTime ?? null,
        tsaUrl: timestamp?.tsaUrl ?? null,
      }
    } else {
      versionPath = path.join(documentsDir, `${document.id}-v${version}.pdf`)
      versionHash = sha256Hex(signedBytes)
      await writeStoredFile(versionPath, signedBytes)
    }

    await prisma.$transaction([
      prisma.signatory.update({
        where: { id: signatory.id },
        data: {
          signedAt,
          linkUsedAt: signedAt,
          methode: 'manuscrite',
          ipAddress: meta.ip,
          userAgent: meta.userAgent ?? null,
          otpChannels: channels.join('+'),
        },
      }),
      ...challenges.map((c) => prisma.otpChallenge.update({ where: { id: c.id }, data: { consumedAt: signedAt } })),
      // Version de travail intermédiaire : le hash de référence n'est fixé qu'à la version finale scellée.
      ...(isLast ? [] : [prisma.document.update({ where: { id: document.id }, data: { finalPdfPath: versionPath } })]),
    ])

    await recordAuditEvent({
      organizationId: document.organizationId,
      ...auditCtx,
      action: 'SIGNATORY_SIGNED',
      objectType: 'Signatory',
      objectId: signatory.id,
      documentId: document.id,
      details: { version, sha256Version: versionHash, canauxOtp: channels },
    })

    if (finalData) {
      await transitionDocumentSignedIfComplete(document.id, document.organizationId, finalData, auditCtx)
      await recordAuditEvent({
        organizationId: document.organizationId,
        actorId: null,
        actorLabel: 'Plateforme SignSecure',
        action: 'DOCUMENT_SEALED',
        objectType: 'Document',
        objectId: document.id,
        documentId: document.id,
        ip: 'system',
        details: {
          sha256Final: finalData.hashSha256,
          cachet: 'PAdES auto-signé, démonstration, non qualifié',
          empreinteCertificat: finalData.sealCertFingerprint,
          horodatageTiers: finalData.tsaGenTime ? finalData.tsaGenTime.toISOString() : null,
        },
      })
    }

    return { success: true as const, dossierId: document.id, trackingCode: document.trackingCode! }
  })
}

/**
 * Prévisualisation authentifiée du PDF d'un dossier (Mes dossiers, Rapport de
 * preuve) — jamais de chemin de stockage exposé directement au client
 * (CLAUDE.md § Sécurité). Renvoie la dernière version signée si elle existe,
 * sinon le PDF d'origine déposé.
 */
export async function getDocumentFilePath(documentId: string, organizationId: string): Promise<string> {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId } })
  if (!document) throw ApiError.notFound('Dossier introuvable.')
  const filePath = document.finalPdfPath ?? document.fichierPath
  if (!filePath) throw ApiError.notFound('Fichier introuvable.')
  return filePath
}

export async function getTimestampTokenPath(documentId: string, organizationId: string): Promise<string> {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId, origine: 'SIGN' } })
  if (!document?.tsaTokenPath) throw ApiError.notFound("Aucun jeton d'horodatage tiers pour ce dossier.")
  return document.tsaTokenPath
}

/**
 * Rapport de preuve structuré en 5 blocs (expéditeur, signataire,
 * authentification, contexte et dates, empreinte), sur le modèle des dossiers
 * de preuve du marché. Ce rapport est interne à l'organisation.
 */
export async function getProofReport(documentId: string, organizationId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId, origine: 'SIGN' },
    include: { signataires: { orderBy: { ordre: 'asc' } }, createdBy: true, organization: true },
  })
  if (!document) throw ApiError.notFound('Dossier introuvable.')

  const events = await prisma.auditEvent.findMany({
    where: { documentId },
    orderBy: { timestampServer: 'asc' },
  })
  const sentEvent = events.find((e) => e.action === 'DOCUMENT_SENT')
  const sealCert = document.sealCertFingerprint
    ? await prisma.sealCertificate.findUnique({ where: { fingerprint: document.sealCertFingerprint } })
    : null
  const chain = await verifyAuditChain(organizationId)

  return {
    titre: document.titre,
    codeReference: document.trackingCode,
    statut: document.statut,
    expediteur: {
      nom: `${document.createdBy.prenom} ${document.createdBy.nom}`,
      organisation: document.organization.nom,
      dateCreation: document.createdAt,
      dateEnvoi: sentEvent?.timestampServer ?? null,
    },
    signataires: document.signataires.map((s) => ({
      nom: s.nom,
      email: s.email,
      telephone: maskPhone(s.telephone),
      identite: DECLARED_IDENTITY_NOTICE,
      signe: s.signedAt !== null,
      methode: s.methode,
      authentification: {
        lienUnique: true,
        canauxOtp: s.otpChannels ? s.otpChannels.split('+') : [],
      },
      contexte: { ip: s.ipAddress, userAgent: s.userAgent },
      dates: { consentement: s.consentedAt, validation: s.signedAt },
    })),
    empreinte: {
      sha256Final: document.hashSha256,
      sha256Original: document.originalHashSha256,
      nombrePages: document.nombrePagesPdf,
      cachet: document.sealedAt
        ? {
            date: document.sealedAt,
            nature: 'Cachet de plateforme PAdES auto-signé — démonstration, non qualifié',
            empreinteCertificat: document.sealCertFingerprint,
            // Comparaison avec le certificat actuellement publié : une différence signale un changement de clé.
            conformeAuCertificatPublie: document.sealCertFingerprint === getSealCertificateInfo().empreinteSha256,
            // Le certificat utilisé figure-t-il dans l'historique publié (actuel ou retiré) ?
            certificatConnu: Boolean(sealCert),
            certificatPeriode: sealCert ? { depuis: sealCert.activeFrom, jusqua: sealCert.retiredAt } : null,
          }
        : null,
      horodatageTiers: document.tsaGenTime ? { date: document.tsaGenTime, service: document.tsaUrl } : null,
    },
    journal: { chaineIntacte: chain.intact },
    timeline: events.map((e) => ({ type: e.action, acteur: e.actorLabel, date: e.timestampServer, details: e.objectType })),
    hash: document.hashSha256,
    disclaimer:
      "Ce rapport reflète les contrôles techniques effectués par la plateforme (empreinte SHA-256, cachet de démonstration non qualifié, horodatage serveur, journal d'audit chaîné). L'identité des signataires est déclarée par l'émetteur et n'a pas été vérifiée. Ce rapport ne remplace pas une expertise judiciaire.",
  }
}

export async function revokeDocument(documentId: string, motif: string, actor: Actor) {
  await getOwnedSignDocument(documentId, actor.organizationId)
  // Ne jamais renvoyer la ligne Prisma brute au client (API_CONTRACT.md attend
  // { success: true } — la ligne complète exposerait entre autres les chemins
  // serveur fichierPath/finalPdfPath).
  await transitionDocumentRevoked(documentId, actor.organizationId, motif, toAuditContext(actor))
  return { success: true as const }
}

/**
 * GET /api/documents — non spécifique à Sign : le frontend Trace réutilise ce
 * même endpoint et filtre côté client sur `origine` (pas d'endpoint de liste
 * dédié dans API_CONTRACT.md § Trace).
 */
export async function listDocuments(
  organizationId: string,
  filters: { statut?: string; type?: string; date?: string; q?: string; pages?: string },
) {
  // Recherche interne sans code de suivi : intitulé, code, référence,
  // organisme, nom ou email d'un signataire (toujours limitée à l'organisation).
  const q = filters.q?.trim()
  const pages = filters.pages ? Number(filters.pages) : undefined
  const documents = await prisma.document.findMany({
    where: {
      organizationId,
      ...(q
        ? {
            OR: [
              { titre: { contains: q } },
              { trackingCode: { contains: q.toUpperCase() } },
              { reference: { contains: q } },
              { organismeDeclare: { contains: q } },
              { signataires: { some: { OR: [{ nom: { contains: q } }, { email: { contains: q.toLowerCase() } }] } } },
            ],
          }
        : {}),
      ...(pages && Number.isInteger(pages) ? { OR: [{ nombrePagesPdf: pages }, { nombrePages: pages }] } : {}),
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
