/**
 * Contrôle de pièce d'identité des signataires — humain, sans biométrie.
 *
 * Parcours : le signataire photographie sa pièce depuis son lien de
 * signature ; un Vérificateur ou un Superviseur de l'organisation (jamais
 * l'émetteur du dossier) la compare au nom déclaré et décide. Tant que la
 * pièce n'est pas validée, la signature est impossible.
 *
 * Protection des données (Code du numérique, art. 407 et 424) : une carte
 * d'identité porte le numéro national d'identification, dont le traitement
 * demande une autorisation de l'APDP. Les photos ne sont donc conservées que
 * le temps du contrôle (chiffrées, métadonnées effacées), puis SUPPRIMÉES dès
 * la décision, ou au bout de IDENTITY_PENDING_DAYS sans décision. Il ne reste
 * que leurs empreintes et la décision, inscrites au journal chaîné. Aucune
 * reconnaissance faciale, aucune lecture automatique du numéro.
 *
 * Ce contrôle ne fait pas de SignSecure un service d'identité vérifiée : le
 * rapport de preuve indique « pièce contrôlée visuellement par l'organisation ».
 */
import path from 'node:path'
import { unlink } from 'node:fs/promises'
import type { Actor } from '../../lib/actor.js'
import { prisma } from '../../db.js'
import { env } from '../../env.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { sendEmail } from '../../lib/notify.js'
import { storeSanitizedImage } from '../../lib/imageSanitizer.js'
import { identitiesDir } from '../../lib/storage.js'

export const IDENTITY_DOC_TYPES = ['CNI', 'CIP', 'PASSEPORT', 'PERMIS', 'CARTE_CONSULAIRE', 'AUTRE'] as const
export type IdentityDocType = (typeof IDENTITY_DOC_TYPES)[number]
export const IDENTITY_PENDING_DAYS = 7

const DOC_LABELS: Record<IdentityDocType, string> = {
  CNI: "carte nationale d'identité",
  CIP: "certificat d'identification personnelle",
  PASSEPORT: 'passeport',
  PERMIS: 'permis de conduire',
  CARTE_CONSULAIRE: 'carte consulaire',
  AUTRE: "autre pièce d'identité",
}

export function identityDocLabel(type: string | null | undefined): string {
  return DOC_LABELS[type as IdentityDocType] ?? "pièce d'identité"
}

async function removeFiles(...paths: Array<string | null | undefined>) {
  await Promise.all(paths.filter((p): p is string => Boolean(p)).map((p) => unlink(p).catch(() => undefined)))
}

/** Le signataire envoie sa pièce depuis son lien (le lien lui-même l'autorise). */
export async function submitIdentityDocument(
  signatory: { id: string; nom: string; documentId: string; identityStatus: string | null; identityFrontPath: string | null; identityBackPath: string | null; document: { organizationId: string; titre: string } },
  input: { typePiece: IdentityDocType; recto: Express.Multer.File; verso?: Express.Multer.File },
  meta: { ip: string; userAgent?: string | null },
) {
  if (signatory.identityStatus !== 'A_FOURNIR' && signatory.identityStatus !== 'REFUSEE') {
    throw ApiError.conflict('IDENTITY_NOT_EXPECTED', signatory.identityStatus === 'EN_ATTENTE' ? 'Votre pièce est déjà en cours de contrôle.' : "Aucune pièce d'identité n'est attendue.")
  }
  const recto = await storeSanitizedImage(identitiesDir, input.recto)
  const verso = input.verso ? await storeSanitizedImage(identitiesDir, input.verso) : null
  await removeFiles(signatory.identityFrontPath, signatory.identityBackPath) // envoi précédent refusé

  await prisma.signatory.update({
    where: { id: signatory.id },
    data: {
      identityStatus: 'EN_ATTENTE',
      identityDocType: input.typePiece,
      identityFrontPath: recto.path,
      identityBackPath: verso?.path ?? null,
      identityFrontSha256: recto.sha256,
      identityBackSha256: verso?.sha256 ?? null,
      identitySubmittedAt: new Date(),
      identityRefusalReason: null,
    },
  })

  await recordAuditEvent({
    organizationId: signatory.document.organizationId,
    actorId: null,
    actorLabel: `Signataire ${signatory.nom}`,
    action: 'IDENTITY_DOC_SUBMITTED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: { typePiece: input.typePiece, sha256Recto: recto.sha256, sha256Verso: verso?.sha256 ?? null },
  })

  const reviewers = await prisma.user.findMany({
    where: { organizationId: signatory.document.organizationId, statut: 'ACTIF', roles: { some: { role: { in: ['VERIFICATEUR', 'SUPERVISEUR'] } } } },
    select: { email: true },
  })
  await Promise.all(
    reviewers.map((r) =>
      sendEmail(
        r.email,
        "Une pièce d'identité attend votre contrôle",
        `Un signataire du document « ${signatory.document.titre} » a envoyé sa pièce d'identité.\n` +
          `Contrôlez-la dans SignSecure : ${env.frontendBaseUrl}/identites\n\n` +
          `Sans décision sous ${IDENTITY_PENDING_DAYS} jours, la pièce est supprimée automatiquement.`,
      ),
    ),
  )
  return { statut: 'EN_ATTENTE' as const }
}

const REVIEW_ROLES = ['VERIFICATEUR', 'SUPERVISEUR'] as const

async function getPendingSignatory(signatoryId: string, organizationId: string) {
  const signatory = await prisma.signatory.findFirst({
    where: { id: signatoryId, document: { organizationId } },
    include: { document: true },
  })
  if (!signatory) throw ApiError.notFound('Signataire introuvable.')
  return signatory
}

export async function listPendingIdentityChecks(organizationId: string) {
  const pending = await prisma.signatory.findMany({
    where: { identityStatus: 'EN_ATTENTE', document: { organizationId } },
    include: { document: { include: { createdBy: true } } },
    orderBy: { identitySubmittedAt: 'asc' },
  })
  return {
    controles: pending.map((s) => ({
      signataireId: s.id,
      nomDeclare: s.nom,
      document: { id: s.documentId, titre: s.document.titre, code: s.document.trackingCode },
      emetteurId: s.document.createdByUserId,
      emetteur: `${s.document.createdBy.prenom} ${s.document.createdBy.nom}`,
      typePiece: s.identityDocType,
      typePieceLibelle: identityDocLabel(s.identityDocType),
      soumisLe: s.identitySubmittedAt,
      verso: Boolean(s.identityBackPath),
      supprimeLe: s.identitySubmittedAt ? new Date(s.identitySubmittedAt.getTime() + IDENTITY_PENDING_DAYS * 86_400_000) : null,
    })),
  }
}

/** Accès à la photo pendant le contrôle — chaque consultation est journalisée. */
export async function getIdentityImage(signatoryId: string, face: string, actor: Actor) {
  const signatory = await getPendingSignatory(signatoryId, actor.organizationId)
  const filePath = face === 'verso' ? signatory.identityBackPath : face === 'recto' ? signatory.identityFrontPath : null
  if (signatory.identityStatus !== 'EN_ATTENTE' || !filePath) throw ApiError.notFound('Pièce indisponible (déjà contrôlée et supprimée, ou absente).')
  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'IDENTITY_DOC_VIEWED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip: actor.ip,
    userAgent: actor.userAgent,
    details: { face },
  })
  return { path: filePath, mimeType: path.extname(filePath) === '.png' ? 'image/png' : path.extname(filePath) === '.webp' ? 'image/webp' : 'image/jpeg' }
}

export async function decideIdentityCheck(
  signatoryId: string,
  input: { decision: 'VALIDEE' | 'REFUSEE'; nomConforme: boolean; motif?: string },
  actor: Actor & { roles?: string[] },
) {
  const signatory = await getPendingSignatory(signatoryId, actor.organizationId)
  if (signatory.identityStatus !== 'EN_ATTENTE') throw ApiError.conflict('IDENTITY_NOT_PENDING', "Cette pièce n'est pas en attente de contrôle.")
  // Séparation des rôles : l'émetteur du dossier ne contrôle pas l'identité de ses propres signataires.
  if (signatory.document.createdByUserId === actor.id) {
    throw ApiError.forbiddenCode('SAME_PERSON', "Vous avez émis ce dossier : un autre vérificateur doit contrôler l'identité de ses signataires.")
  }
  if (input.decision === 'VALIDEE' && !input.nomConforme) {
    throw ApiError.badRequest('NAME_MISMATCH', 'Une pièce ne peut être validée que si le nom correspond au nom déclaré.')
  }
  if (input.decision === 'REFUSEE' && !input.motif?.trim()) {
    throw ApiError.badRequest('MOTIF_REQUIRED', 'Indiquez au signataire pourquoi sa pièce est refusée.')
  }

  const now = new Date()
  const validated = input.decision === 'VALIDEE'
  await prisma.signatory.update({
    where: { id: signatory.id },
    data: {
      identityStatus: input.decision,
      identityReviewedAt: now,
      identityReviewerId: actor.id,
      identityReviewerLabel: actor.label,
      identityNameMatches: input.nomConforme,
      identityRefusalReason: validated ? null : input.motif!.trim(),
      identityFrontPath: null,
      identityBackPath: null,
      // Le signataire dispose de nouveau du délai complet pour signer après la validation.
      ...(validated ? { linkExpiresAt: new Date(now.getTime() + env.signerLinkExpiryHours * 3_600_000) } : {}),
    },
  })
  // Minimisation : la photo disparaît dès la décision.
  await removeFiles(signatory.identityFrontPath, signatory.identityBackPath)

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'IDENTITY_CHECKED',
    objectType: 'Signatory',
    objectId: signatory.id,
    documentId: signatory.documentId,
    ip: actor.ip,
    userAgent: actor.userAgent,
    details: {
      decision: input.decision,
      nomConforme: input.nomConforme,
      typePiece: signatory.identityDocType,
      sha256Recto: signatory.identityFrontSha256,
      sha256Verso: signatory.identityBackSha256,
      photosSupprimees: true,
    },
  })

  const link = `${env.frontendBaseUrl}/signer/${signatory.linkToken}`
  await sendEmail(
    signatory.email,
    validated ? `Votre pièce d'identité a été contrôlée : ${signatory.document.titre}` : `Votre pièce d'identité n'a pas été acceptée : ${signatory.document.titre}`,
    validated
      ? `Bonjour ${signatory.nom},\n\nVotre pièce d'identité a été contrôlée. Vous pouvez maintenant signer le document : ${link}\n\nLa photo de votre pièce a été supprimée.`
      : `Bonjour ${signatory.nom},\n\nVotre pièce n'a pas pu être acceptée : ${input.motif!.trim()}\nVous pouvez en envoyer une nouvelle depuis votre lien : ${link}\n\nLa photo envoyée a été supprimée.`,
  )
  return { success: true as const, statut: input.decision }
}

/** Tâche planifiée : supprime les pièces restées sans décision trop longtemps. */
export async function purgeStaleIdentityDocuments(now = new Date()) {
  const limit = new Date(now.getTime() - IDENTITY_PENDING_DAYS * 86_400_000)
  const stale = await prisma.signatory.findMany({ where: { identityStatus: 'EN_ATTENTE', identitySubmittedAt: { lt: limit } }, include: { document: true } })
  for (const s of stale) {
    await removeFiles(s.identityFrontPath, s.identityBackPath)
    await prisma.signatory.update({ where: { id: s.id }, data: { identityStatus: 'A_FOURNIR', identityFrontPath: null, identityBackPath: null } })
    await recordAuditEvent({
      organizationId: s.document.organizationId,
      actorId: null,
      actorLabel: 'Système (suppression automatique)',
      action: 'IDENTITY_DOC_PURGED',
      objectType: 'Signatory',
      objectId: s.id,
      documentId: s.documentId,
      ip: 'system',
    })
  }
  return { supprimees: stale.length }
}

export { REVIEW_ROLES }
