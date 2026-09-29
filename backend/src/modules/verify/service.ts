import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { sha256Hex } from '../../lib/storage.js'

interface RequestMeta {
  ip: string
  userAgent?: string | null
}

/**
 * Réponse publique de vérification — n'expose jamais de nom complet, adresse,
 * commentaire interne ni détail d'incident (CLAUDE.md § Verify). Un code
 * inconnu renvoie un statut neutre, jamais 404 (anti-énumération).
 *
 * Deux niveaux de contrôle, jamais confondus :
 *  - Sign : empreinte SHA-256 exacte de la version finale scellée ;
 *  - Trace : aucune comparaison automatique — une copie papier ne s'examine
 *    qu'à la main, par un Vérificateur de l'organisation (examen de
 *    concordance enregistré dans le journal).
 */
export async function verifyByCode(code: string, meta: RequestMeta) {
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
    ip: meta.ip,
    userAgent: meta.userAgent,
  })

  if (document.origine === 'SIGN') {
    return {
      statut: document.statut,
      origine: document.origine,
      integrite: {
        methode: 'hash_exact' as const,
        hashDisponible: Boolean(document.hashSha256),
        hash: document.hashSha256,
        nombrePages: document.nombrePagesPdf,
        cachetPlateforme: Boolean(document.sealedAt),
        horodatageTiers: document.tsaGenTime,
      },
      signature: { type: document.type, titre: document.titre, dateScellement: document.sealedAt },
      revocation: document.statut === 'REVOKED' ? { revoque: true, date: document.revokedAt } : undefined,
    }
  }

  const openIncidents = await prisma.incident.count({ where: { documentId: document.id, statut: 'INCIDENT_OPEN' } })
  return {
    statut: document.statut,
    origine: document.origine,
    integrite: { methode: 'examen_humain' as const },
    tracabilite: {
      reference: document.reference,
      nombrePages: document.nombrePages,
      dateEnregistrement: document.createdAt,
      incidentEnCours: openIncidents > 0,
    },
    revocation: undefined,
  }
}

export async function compareFile(code: string, fileBuffer: Buffer, meta: RequestMeta) {
  const document = await prisma.document.findUnique({ where: { trackingCode: code } })
  if (!document) {
    // Comportement neutre identique à GET /verify/:code — pas de 404 distinctif.
    throw ApiError.badRequest('UNKNOWN_CODE', 'Code de suivi inconnu.')
  }

  if (document.origine === 'TRACE') {
    // Jamais de hash exact ni de score automatique sur une photo/scan
    // (CLAUDE.md § Verify) : la comparaison relève d'un examen humain.
    return {
      methode: 'examen_humain' as const,
      message:
        "Un document papier photographié ou scanné ne peut pas être comparé automatiquement. Présentez la copie à l'organisation émettrice : un vérificateur l'examinera à côté des photos enregistrées à la réception.",
    }
  }

  if (!document.hashSha256) {
    throw ApiError.conflict('NO_FINAL_VERSION', "Ce document n'a pas encore de version finale signée à comparer.")
  }

  const submittedHash = sha256Hex(fileBuffer)
  const matches = submittedHash === document.hashSha256

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: 'Vérification publique',
    action: 'VERIFY_COMPARE',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: { sha256Soumis: submittedHash, correspondance: matches },
  })

  // Comparaison d'empreinte EXACTE : un seul octet modifié change le résultat.
  return {
    methode: 'hash_exact' as const,
    resultat: matches ? ('correspond' as const) : ('diverge' as const),
    hashSoumis: submittedHash,
    hashReference: document.hashSha256,
  }
}
