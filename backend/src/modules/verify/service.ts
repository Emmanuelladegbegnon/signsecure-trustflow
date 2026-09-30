import { prisma } from '../../db.js'
import { ApiError } from '../../lib/errors.js'
import { recordAuditEvent } from '../../lib/audit.js'
import { readStoredFile, sha256Hex } from '../../lib/storage.js'
import { inspectTrackingCode } from '../../lib/trackingCode.js'
import { isValidPageToken } from '../../lib/pageToken.js'
import { getSealCertificateInfo, sealCertificateHistory } from '../../lib/pdfSeal.js'
import { extractPagePreview } from '../sign/pdf.js'

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
export async function verifyByCode(rawCode: string, meta: RequestMeta) {
  const code = rawCode.trim().toUpperCase()
  // Caractère de contrôle faux = faute de frappe ou code retouché. L'algorithme
  // est public : ce retour n'apprend rien sur l'existence d'un document.
  if (inspectTrackingCode(code) === 'bad_check') {
    return { statut: 'UNKNOWN_CODE' as const, controle: 'CARACTERE_DE_CONTROLE_INVALIDE' as const }
  }
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
        empreinteCertificatCachet: document.sealCertFingerprint,
        horodatageTiers: document.tsaGenTime,
        apercuParPage: Boolean(document.sealedAt),
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

/**
 * Aperçu scellé d'une page, ouvert par le QR imprimé sur cette page (jeton
 * lié au code et au numéro de page, voir lib/pageToken.ts). Réponse neutre et
 * identique pour un code inconnu ou un jeton invalide.
 */
export async function getPagePreview(rawCode: string, pageNumber: number, token: string, meta: RequestMeta) {
  const code = rawCode.trim().toUpperCase()
  const invalid = () => ApiError.badRequest('INVALID_PAGE_LINK', "Ce lien de page n'est pas reconnu. Saisissez le code de suivi à la main.")
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !token || !isValidPageToken(code, pageNumber, token)) throw invalid()

  const document = await prisma.document.findUnique({ where: { trackingCode: code } })
  if (!document || document.origine !== 'SIGN' || !document.sealedAt || !document.finalPdfPath) throw invalid()

  let preview
  try {
    preview = await extractPagePreview(await readStoredFile(document.finalPdfPath), pageNumber)
  } catch (err) {
    if (err instanceof RangeError) throw invalid()
    throw err
  }

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: 'Vérification publique',
    action: 'VERIFY_PAGE_PREVIEW',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: { page: pageNumber },
  })
  return { bytes: preview.bytes, total: preview.total }
}

/**
 * Retrouver un document sans code de suivi (code illisible ou retouché) :
 * l'empreinte SHA-256 du PDF soumis est cherchée parmi les versions finales.
 * Aucun risque d'énumération — une empreinte de 256 bits ne se devine pas.
 * Ne fonctionne que sur le fichier numérique exact, jamais sur un scan.
 */
export async function findByFile(fileBuffer: Buffer, meta: RequestMeta) {
  const submittedHash = sha256Hex(fileBuffer)
  const document = await prisma.document.findFirst({ where: { hashSha256: submittedHash, origine: 'SIGN' } })
  if (!document) return { trouve: false as const, hashSoumis: submittedHash }

  await recordAuditEvent({
    organizationId: document.organizationId,
    actorId: null,
    actorLabel: 'Vérification publique',
    action: 'VERIFY_FIND_BY_FILE',
    objectType: 'Document',
    objectId: document.id,
    documentId: document.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  })
  return { trouve: true as const, trackingCode: document.trackingCode, statut: document.statut, hashSoumis: submittedHash }
}

/** Certificat de cachet actuellement en service — publié pour détecter un changement de clé. */
export async function getPublishedSealCertificate() {
  return {
    ...getSealCertificateInfo(),
    historique: await sealCertificateHistory(),
    nature: 'Certificat auto-signé de démonstration, non qualifié. SignSecure n\'est pas un prestataire de services de confiance.',
  }
}
