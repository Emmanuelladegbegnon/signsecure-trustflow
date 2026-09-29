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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { env } from '../../env.js'
import { sealPdf } from '../../lib/pdfSeal.js'
import { sha256Hex } from '../../lib/storage.js'

export interface SignatureZone {
  page: number // 1-indexé
  x: number // pourcentage (0-100) depuis le bord gauche, comme affiché dans l'UI d'assignation
  y: number // pourcentage (0-100) depuis le bord haut
}

const SIGNATURE_WIDTH_RATIO = 0.18 // largeur de la signature ≈ 18% de la largeur de page

export async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(pdfBytes)).getPageCount()
}

/** Embarque une signature (image PNG/JPEG en base64 data URL ou brute) dans le PDF, à la zone indiquée. */
export async function embedSignature(sourceBytes: Uint8Array, zone: SignatureZone, signatureImageBase64: string): Promise<Uint8Array> {
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
  return pdfDoc.save()
}

export function verificationUrl(trackingCode: string): string {
  return `${env.publicVerifyBaseUrl.replace(/\/$/, '')}/verifier/resultat/${encodeURIComponent(trackingCode)}`
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
  const qrPng = await QRCode.toBuffer(verificationUrl(trackingCode), { errorCorrectionLevel: 'M', margin: 1, width: 240 })
  const qr = await pdfDoc.embedPng(qrPng)

  const pages = pdfDoc.getPages()
  const total = pages.length
  const domain = displayDomain()
  const qrSize = 46
  const bandHeight = qrSize + 8
  const grey = rgb(0.25, 0.25, 0.3)

  pages.forEach((page, index) => {
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
    page.drawText(`Page ${index + 1}/${total} — document de ${total} page${total > 1 ? 's' : ''}`, { x: textX, y: bandHeight - 37, size: 7, font, color: grey })
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
