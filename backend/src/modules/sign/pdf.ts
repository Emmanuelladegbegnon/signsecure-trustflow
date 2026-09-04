/**
 * Génération du PDF final signé (CLAUDE.md § Signature — règle stricte) :
 * l'image de signature est embarquée directement dans le PDF au moment de
 * cette génération, puis n'existe plus nulle part ailleurs — elle n'a jamais
 * été écrite en base ni sur disque avant cet appel (voir lib/pendingSignatures.ts).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'

export interface SignatureZone {
  page: number // 1-indexé
  x: number // pourcentage (0-100) depuis le bord gauche, comme affiché dans l'UI d'assignation
  y: number // pourcentage (0-100) depuis le bord haut
}

const SIGNATURE_WIDTH_RATIO = 0.18 // largeur de la signature ≈ 18% de la largeur de page

/**
 * Embarque une signature (image PNG en base64 data URL ou brute) dans le PDF
 * source, à la zone indiquée, écrit le résultat sur disque et retourne son
 * hash SHA-256 — toujours calculé côté serveur sur les octets réellement écrits.
 */
export async function embedSignatureInPdf(
  sourcePath: string,
  destPath: string,
  zone: SignatureZone,
  signatureImageBase64: string,
): Promise<{ hashSha256: string }> {
  const sourceBytes = await readFile(sourcePath)
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

  const finalBytes = await pdfDoc.save()
  await writeFile(destPath, finalBytes)

  const hashSha256 = createHash('sha256').update(finalBytes).digest('hex')
  return { hashSha256 }
}
