/**
 * Génération des versions signées (CLAUDE.md § Signature — règle stricte) :
 * l'image de signature est embarquée directement dans le PDF au moment de
 * cette génération, puis n'existe plus nulle part ailleurs — elle n'a jamais
 * été écrite en base ni sur disque avant cet appel (voir lib/pendingSignatures.ts).
 *
 * Quand le dernier signataire a signé, la version finale reçoit en plus :
 *   1. un pied de page de vérification sur chaque page (QR, code de suivi,
 *      domaine officiel en clair, numéro de page / nombre total de pages) ;
 *   2. le cachet de plateforme PAdES (lib/pdfSeal.ts), en dernier.
 * Le hash SHA-256 de référence est calculé sur les octets finaux, après cachet.
 *
 * Le hash ne peut pas être imprimé dans le PDF lui-même (l'imprimer
 * changerait le fichier, donc son hash) : il est affiché par Verify et dans
 * le rapport de preuve.
 */
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { env } from '../../env.js'
import { sealPdf } from '../../lib/pdfSeal.js'
import { pageToken } from '../../lib/pageToken.js'
import { sha256Hex } from '../../lib/storage.js'

export interface SignatureZone {
  page: number // 1-indexé
  x: number // pourcentage (0-100) depuis le bord gauche, comme affiché dans l'UI d'assignation
  y: number // pourcentage (0-100) depuis le bord haut
}

const SIGNATURE_WIDTH_RATIO = 0.18 // largeur de la signature ≈ 18% de la largeur de page
const PARAPHE_WIDTH_RATIO = 0.07 // paraphe ≈ 7% de la largeur de page
const FOOTER_BAND_HEIGHT = 54

export async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(pdfBytes)).getPageCount()
}

/**
 * Embarque une signature (image PNG/JPEG en base64 data URL ou brute) dans le
 * PDF, à la zone indiquée, et la même image en réduction (paraphe) sur toutes
 * les autres pages : sur un exemplaire imprimé, chaque page porte la marque
 * de chaque signataire. `slot` = rang du signataire, pour que les paraphes ne
 * se chevauchent pas.
 */
export async function embedSignature(
  sourceBytes: Uint8Array,
  zone: SignatureZone,
  signatureImageBase64: string,
  slot = 0,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(sourceBytes)

  const pageIndex = Math.min(Math.max(zone.page - 1, 0), pdfDoc.getPageCount() - 1)
  const page = pdfDoc.getPage(pageIndex)
  const { width: pageWidth, height: pageHeight } = page.getSize()

  const base64Data = signatureImageBase64.replace(/^data:image\/\w+;base64,/, '')
  const imageBytes = Buffer.from(base64Data, 'base64')
  const isJpeg = signatureImageBase64.startsWith('data:image/jpeg')
  const image = isJpeg ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes)

  const drawWidth = pageWidth * SIGNATURE_WIDTH_RATIO
  const drawHeight = drawWidth * (image.height / image.width)

  // Coordonnées UI en pourcentage, origine haut-gauche → coordonnées PDF en
  // points, origine bas-gauche.
  const x = (zone.x / 100) * pageWidth
  const y = pageHeight - (zone.y / 100) * pageHeight - drawHeight

  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight })

  pdfDoc.getPages().forEach((other, index) => {
    if (index === pageIndex) return
    const { width: w } = other.getSize()
    const parapheWidth = w * PARAPHE_WIDTH_RATIO
    const parapheHeight = parapheWidth * (image.height / image.width)
    other.drawImage(image, {
      x: w - 20 - (slot + 1) * (parapheWidth + 6),
      y: FOOTER_BAND_HEIGHT + 6,
      width: parapheWidth,
      height: parapheHeight,
    })
  })
  return pdfDoc.save()
}

export function verificationUrl(trackingCode: string, page?: number): string {
  const base = `${env.publicVerifyBaseUrl.replace(/\/$/, '')}/verifier/resultat/${encodeURIComponent(trackingCode)}`
  return page ? `${base}?page=${page}&k=${pageToken(trackingCode, page)}` : base
}

/** Domaine affiché en clair sous le QR : permet de repérer un QR piégé qui mènerait ailleurs. */
function displayDomain(): string {
  try {
    return new URL(env.publicVerifyBaseUrl).host
  } catch {
    return env.publicVerifyBaseUrl
  }
}

async function addVerificationFooter(pdfDoc: PDFDocument, trackingCode: string): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const total = pages.length
  const domain = displayDomain()
  const qrSize = 46
  const bandHeight = FOOTER_BAND_HEIGHT
  const grey = rgb(0.25, 0.25, 0.3)

  // Un QR propre à chaque page : il ouvre l'aperçu scellé de CETTE page.
  const qrs = await Promise.all(
    pages.map(async (_, index) =>
      pdfDoc.embedPng(await QRCode.toBuffer(verificationUrl(trackingCode, index + 1), { errorCorrectionLevel: 'M', margin: 1, width: 240 })),
    ),
  )

  pages.forEach((page, index) => {
    const qr = qrs[index]!
    const { width } = page.getSize()
    page.drawRectangle({ x: 0, y: 0, width, height: bandHeight, color: rgb(1, 1, 1), opacity: 0.92 })
    page.drawLine({ start: { x: 16, y: bandHeight }, end: { x: width - 16, y: bandHeight }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) })
    page.drawImage(qr, { x: width - qrSize - 16, y: 4, width: qrSize, height: qrSize })

    const textX = 20
    page.drawText(`Code de suivi : ${trackingCode}`, { x: textX, y: bandHeight - 14, size: 8.5, font: bold, color: grey })
    page.drawText(`Vérifier uniquement sur ${domain}/verifier (saisie manuelle du code possible)`, {
      x: textX,
      y: bandHeight - 26,
      size: 7,
      font,
      color: grey,
    })
    page.drawText(`Page ${index + 1}/${total} — scannez le QR de cette page pour afficher son aperçu scellé et la comparer`, {
      x: textX,
      y: bandHeight - 37,
      size: 7,
      font,
      color: grey,
    })
    page.drawText('Cachet électronique SignSecure de démonstration, non qualifié. Pour contrôler l\'intégrité, soumettre ce fichier sur la page de vérification.', {
      x: textX,
      y: bandHeight - 48,
      size: 6,
      font,
      color: grey,
      maxWidth: width - qrSize - 56,
    })
  })
}

/**
 * Produit la version finale : pied de page de vérification + cachet PAdES.
 * Retourne les octets définitifs et leur hash SHA-256, calculé côté serveur.
 */
export async function finalizeSignedPdf(
  signedBytes: Uint8Array,
  trackingCode: string,
  sealedAt: Date,
): Promise<{ bytes: Buffer; hashSha256: string; pageCount: number }> {
  const pdfDoc = await PDFDocument.load(signedBytes)
  await addVerificationFooter(pdfDoc, trackingCode)
  const withFooter = await pdfDoc.save({ useObjectStreams: false })
  const bytes = await sealPdf(withFooter, sealedAt)
  return { bytes, hashSha256: sha256Hex(bytes), pageCount: pdfDoc.getPageCount() }
}

/**
 * Aperçu de contrôle d'UNE page de la version finale, filigrané. Montré à qui
 * présente le QR de cette page (jeton valide) : il possède déjà cette page,
 * l'aperçu ne lui révèle rien de plus, mais lui permet de repérer une page
 * substituée sur son exemplaire imprimé.
 */
export async function extractPagePreview(finalBytes: Uint8Array, pageNumber: number): Promise<{ bytes: Uint8Array; total: number }> {
  const source = await PDFDocument.load(finalBytes)
  const total = source.getPageCount()
  if (pageNumber < 1 || pageNumber > total) throw new RangeError('Page hors du document.')
  const preview = await PDFDocument.create()
  const [copied] = await preview.copyPages(source, [pageNumber - 1])
  const page = preview.addPage(copied!)
  const font = await preview.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  page.drawText(`APERÇU DE CONTRÔLE — PAGE ${pageNumber}/${total} — NE VAUT PAS ORIGINAL`, {
    x: width * 0.08,
    y: height * 0.35,
    size: Math.max(width / 32, 12),
    font,
    color: rgb(0.8, 0.1, 0.1),
    opacity: 0.25,
    rotate: degrees(35),
  })
  return { bytes: await preview.save(), total }
}
