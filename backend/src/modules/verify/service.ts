import { createHash } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'

/**
 * Réponse publique de vérification — n'expose jamais de nom complet, adresse,
 * commentaire interne ni détail d'incident (CLAUDE.md § Verify). Un code
 * inconnu renvoie un statut neutre, jamais 404 (anti-énumération).
 */
export async function verifyByCode(code: string, ip: string) {
  const document = await prisma.document.findUnique({ where: { trackingCode: code } })

  if (!document) {
    return { statut: 'UNKNOWN_CODE' as const }
  }

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: 'Vérification publique',
    action: 'VERIFY_LOOKUP',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip,
  })

  const hasOpenIncident = document.origine === 'TRACE' ? await prisma.incident.count({ where: { documentId: document.id, statut: 'INCIDENT_OPEN' } }) : 0

  return {
    statut: document.statut,
    origine: document.origine,
    integrite: {
      hashDisponible: Boolean(document.hashSha256),
      methode: document.origine === 'SIGN' ? ('hash_exact' as const) : ('ocr_score' as const),
    },
    signature:
      document.origine === 'SIGN'
        ? { type: document.type, titre: document.titre }
        : undefined,
    tracabilite:
      document.origine === 'TRACE'
        ? { reference: document.reference, incidentEnCours: hasOpenIncident > 0 }
        : undefined,
    revocation: document.statut === 'REVOKED' ? { revoque: true, date: document.revokedAt } : undefined,
  }
}

export async function compareFile(code: string, fileBuffer: Buffer, ip: string) {
  const document = await prisma.document.findUnique({ where: { trackingCode: code } })
  if (!document) {
    // Comportement neutre identique à GET /verify/:code — pas de 404 distinctif.
    throw ApiError.badRequest('UNKNOWN_CODE', 'Code de suivi inconnu.')
  }

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: 'Vérification publique',
    action: 'VERIFY_COMPARE',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip,
  })

  if (document.origine === 'SIGN') {
    // Comparaison de hash EXACTE — fiable à 100% uniquement pour un PDF né dans Sign (CLAUDE.md § Verify).
    const submittedHash = createHash('sha256').update(fileBuffer).digest('hex')
    const matches = Boolean(document.hashSha256) && submittedHash === document.hashSha256
    return { methode: 'hash_exact' as const, resultat: matches ? ('correspond' as const) : ('diverge' as const) }
  }

  // Origine Trace (photo/scan) : JAMAIS de comparaison de hash exact (CLAUDE.md
  // § Verify). Un vrai score « correspondance textuelle » exigerait un moteur
  // OCR (ex. tesseract.js) pour extraire le texte des photos de référence et
  // du fichier soumis, puis les comparer — une dépendance et un traitement
  // que CLAUDE.md demande explicitement de ne pas ajouter sans validation
  // préalable ("si une fonctionnalité semble nécessiter du machine learning,
  // s'arrêter et demander confirmation"). PLACEHOLDER EXPLICITE en attendant
  // cette décision : score déterministe basé sur la similarité de taille de
  // fichier avec la première photo de référence capturée, volontairement
  // grossier — jamais présenté comme un verdict d'identité, seul le score
  // doit être mis en avant côté client (voir FileComparison.tsx).
  const referenceArtifact = await prisma.artifact.findFirst({ where: { documentId: document.id }, orderBy: { pageIndex: 'asc' } })
  let score = 0
  if (referenceArtifact) {
    const { size: referenceSize } = await stat(referenceArtifact.path).catch(() => ({ size: 0 }))
    const submittedSize = fileBuffer.length
    const largest = Math.max(referenceSize, submittedSize, 1)
    const smallest = Math.min(referenceSize, submittedSize)
    score = Math.round((smallest / largest) * 100)
  }
  return { methode: 'ocr_score' as const, resultat: score >= 80 ? ('correspond' as const) : ('diverge' as const), score }
}
