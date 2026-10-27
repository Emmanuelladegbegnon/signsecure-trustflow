/**
 * Nettoyage des photos reçues (Trace, incidents, examens de concordance).
 *
 * Une photo de téléphone embarque des métadonnées : position GPS, modèle de
 * l'appareil, heure du téléphone. SignSecure n'en a pas besoin et CLAUDE.md
 * exclut toute géolocalisation : elles sont supprimées à la réception.
 * L'orientation est appliquée aux pixels avant suppression, pour que la photo
 * ne s'affiche pas couchée.
 *
 * L'empreinte de référence est celle de la photo nettoyée (c'est elle qui est
 * conservée). L'empreinte des octets reçus est aussi journalisée, pour pouvoir
 * rattacher la photo à un original qui circulerait ailleurs.
 */
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { ApiError } from './errors.js'
import { storeBuffer, type StoredFile } from './storage.js'

const sha256Hex = (data: Buffer) => createHash('sha256').update(data).digest('hex')

export interface SanitizedImage {
  buffer: Buffer
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sha256Recu: string
  metadonneesSupprimees: string[]
}

export async function sanitizeImage(input: Buffer, mimeType: string): Promise<SanitizedImage> {
  const image = sharp(input, { failOn: 'error' })
  let meta
  try {
    meta = await image.metadata()
  } catch {
    throw ApiError.badRequest('INVALID_IMAGE', "Le fichier reçu n'est pas une image lisible (JPEG, PNG ou WebP).")
  }
  const removed = [
    meta.exif ? 'EXIF (dont GPS, appareil, heure du téléphone)' : null,
    meta.xmp ? 'XMP' : null,
    meta.iptc ? 'IPTC' : null,
  ].filter((m): m is string => m !== null)

  // rotate() sans argument applique l'orientation EXIF ; sharp n'écrit ensuite
  // aucune métadonnée tant qu'on ne demande pas withMetadata().
  const pipeline = image.rotate()
  const output =
    mimeType === 'image/png'
      ? { buffer: await pipeline.png().toBuffer(), mimeType: 'image/png' as const }
      : mimeType === 'image/webp'
        ? { buffer: await pipeline.webp({ quality: 92 }).toBuffer(), mimeType: 'image/webp' as const }
        : { buffer: await pipeline.jpeg({ quality: 92, mozjpeg: true }).toBuffer(), mimeType: 'image/jpeg' as const }

  return { ...output, sha256Recu: sha256Hex(input), metadonneesSupprimees: removed }
}

export interface StoredImage extends StoredFile {
  sha256Recu: string
  metadonneesSupprimees: string[]
}

/** Nettoie puis stocke (chiffrée) une image reçue ; l'empreinte retournée est celle de l'image conservée. */
export async function storeSanitizedImage(dir: string, file: Express.Multer.File): Promise<StoredImage> {
  const clean = await sanitizeImage(file.buffer, file.mimetype)
  const stored = await storeBuffer(dir, clean.buffer, clean.mimeType)
  return { ...stored, sha256Recu: clean.sha256Recu, metadonneesSupprimees: clean.metadonneesSupprimees }
}
