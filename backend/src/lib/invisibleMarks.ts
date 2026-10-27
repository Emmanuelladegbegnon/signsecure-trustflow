/**
 * Marques invisibles à l'œil, inscrites dans la structure de chaque page du
 * PDF final (et dans le document lui-même). Elles ne s'affichent pas et ne
 * s'impriment pas ; seule la plateforme sait les lire et les contrôler, car
 * elles sont signées par une clé du serveur (HMAC).
 *
 * À quoi elles servent : quand un fichier soumis ne correspond plus
 * exactement à l'original (empreinte différente), elles permettent quand même
 * de dire « ce fichier est une copie MODIFIÉE du document SGN-…, pages 1 à 3 »,
 * et de retrouver l'original sans code de suivi. Un fichier sans marque n'a
 * jamais été scellé par SignSecure.
 *
 * Limite : un outil PDF peut les effacer. Leur absence ne prouve donc pas
 * qu'un fichier est étranger ; leur présence valide prouve qu'il vient de la
 * plateforme. Elles complètent l'empreinte et le cachet, sans les remplacer.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { PDFDocument, PDFName, PDFString, type PDFDict } from 'pdf-lib'
import { env } from '../env.js'

const PAGE_KEY = 'SSMark'
const DOC_KEY = 'SSDocMark'

function mac(value: string): string {
  return createHmac('sha256', `invisible-mark:${env.pageTokenSecret}`).update(value).digest('base64url').slice(0, 22)
}

function pagePayload(code: string, page: number, total: number) {
  return `v1|${code}|${page}|${total}`
}

/** Inscrit une marque signée sur chaque page et sur le document. À appeler avant le cachet. */
export function addInvisibleMarks(pdfDoc: PDFDocument, trackingCode: string): void {
  const pages = pdfDoc.getPages()
  const total = pages.length
  pages.forEach((page, index) => {
    const payload = pagePayload(trackingCode, index + 1, total)
    page.node.set(PDFName.of(PAGE_KEY), PDFString.of(`${payload}|${mac(payload)}`))
  })
  const docPayload = `v1|${trackingCode}|${total}`
  pdfDoc.catalog.set(PDFName.of(DOC_KEY), PDFString.of(`${docPayload}|${mac(docPayload)}`))
}

function checkMac(value: string): { parts: string[]; valid: boolean } {
  const parts = value.split('|')
  const signature = parts.pop() ?? ''
  const expected = Buffer.from(mac(parts.join('|')))
  const given = Buffer.from(signature)
  return { parts, valid: expected.length === given.length && timingSafeEqual(expected, given) }
}

function readString(dict: PDFDict, key: string): string | null {
  const value = dict.lookup(PDFName.of(key))
  return value instanceof PDFString ? value.decodeText() : null
}

export interface MarkReport {
  /** Au moins une marque signée valide a été trouvée. */
  presentes: boolean
  codeDetecte: string | null
  /** Nombre de pages du document d'origine, d'après les marques. */
  pagesDOrigine: number | null
  /** Numéros de page (d'origine) portant une marque valide, dans l'ordre du fichier soumis. */
  pagesMarquees: number[]
  /** Pages du fichier soumis sans marque valide (ajoutées, remplacées ou nettoyées). */
  pagesSansMarque: number[]
  /** Marques présentes mais dont la signature ne correspond pas (fabriquées). */
  marquesFalsifiees: number
}

/** Lit les marques d'un PDF soumis. Ne lève jamais d'erreur : un fichier illisible renvoie « aucune marque ». */
export async function readInvisibleMarks(bytes: Uint8Array): Promise<MarkReport> {
  try {
    return await readMarksUnsafe(bytes)
  } catch {
    // PDF mal formé ou structure inattendue : traité comme « aucune marque ».
    return { presentes: false, codeDetecte: null, pagesDOrigine: null, pagesMarquees: [], pagesSansMarque: [], marquesFalsifiees: 0 }
  }
}

async function readMarksUnsafe(bytes: Uint8Array): Promise<MarkReport> {
  const empty: MarkReport = { presentes: false, codeDetecte: null, pagesDOrigine: null, pagesMarquees: [], pagesSansMarque: [], marquesFalsifiees: 0 }
  let pdf: PDFDocument
  try {
    pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  } catch {
    return empty
  }

  const report: MarkReport = { ...empty, pagesMarquees: [], pagesSansMarque: [] }
  const codes = new Set<string>()
  pdf.getPages().forEach((page, index) => {
    const raw = readString(page.node, PAGE_KEY)
    if (!raw) {
      report.pagesSansMarque.push(index + 1)
      return
    }
    const { parts, valid } = checkMac(raw)
    if (!valid || parts.length !== 4) {
      report.marquesFalsifiees++
      report.pagesSansMarque.push(index + 1)
      return
    }
    codes.add(parts[1]!)
    report.pagesMarquees.push(Number(parts[2]))
    report.pagesDOrigine = Number(parts[3])
  })

  const docRaw = readString(pdf.catalog, DOC_KEY)
  if (docRaw) {
    const { parts, valid } = checkMac(docRaw)
    if (valid) {
      codes.add(parts[1]!)
      report.pagesDOrigine ??= Number(parts[2])
    } else report.marquesFalsifiees++
  }

  report.presentes = codes.size > 0
  // Des pages venant de plusieurs documents différents : on garde le premier et on le signale par les pages sans marque.
  report.codeDetecte = codes.size > 0 ? [...codes][0]! : null
  return report
}
