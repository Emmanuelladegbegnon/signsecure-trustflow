/**
 * Stockage disque des fichiers (PDF Sign, photos Trace). Jamais servi en
 * accès statique direct (CLAUDE.md § Sécurité) — toujours lu depuis un
 * handler authentifié qui vérifie l'organisation avant de renvoyer le
 * fichier (voir sendStoredFile).
 *
 * Les uploads restent en mémoire le temps de la requête : le serveur calcule
 * l'empreinte SHA-256 des octets reçus, puis écrit le fichier chiffré (voir
 * fileCrypto.ts). Aucun fichier en clair n'est écrit sur disque, y compris
 * les fichiers soumis pour une simple comparaison.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import type { Response } from 'express'
import multer from 'multer'
import { env } from '../env.js'
import { decryptBuffer, encryptBuffer } from './fileCrypto.js'

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export const documentsDir = path.resolve(env.uploadDir, 'documents')
export const traceDir = path.resolve(env.uploadDir, 'trace')
export const incidentsDir = path.resolve(env.uploadDir, 'incidents')
export const comparisonsDir = path.resolve(env.uploadDir, 'comparaisons')
export const timestampsDir = path.resolve(env.uploadDir, 'horodatages')
ensureDir(documentsDir)
ensureDir(traceDir)
ensureDir(incidentsDir)
ensureDir(comparisonsDir)
ensureDir(timestampsDir)

const memory = multer.memoryStorage()
const isImage = (mimetype: string) => mimetype === 'image/jpeg' || mimetype === 'image/png' || mimetype === 'image/webp'

export const uploadPdf = multer({
  storage: memory,
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export const uploadImages = multer({
  storage: memory,
  fileFilter: (_req, file, cb) => cb(null, isImage(file.mimetype)),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
})

export const uploadIncidentPhoto = multer({
  storage: memory,
  fileFilter: (_req, file, cb) => cb(null, isImage(file.mimetype)),
  limits: { fileSize: 10 * 1024 * 1024 },
})

/** Fichier soumis pour comparaison (Verify, ou examen de concordance Trace) — PDF ou image. */
export const uploadComparisonFile = multer({
  storage: memory,
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || isImage(file.mimetype)),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export interface StoredFile {
  path: string
  sha256: string
  sizeBytes: number
  mimeType: string
}

/** Écrit un fichier reçu (en mémoire) sur disque, chiffré, et retourne son empreinte calculée côté serveur. */
export async function storeUploadedFile(dir: string, file: Express.Multer.File): Promise<StoredFile> {
  return storeBuffer(dir, file.buffer, file.mimetype)
}

export async function storeBuffer(dir: string, buffer: Buffer, mimeType: string): Promise<StoredFile> {
  const filePath = path.join(dir, `${randomUUID()}${EXTENSIONS[mimeType] ?? ''}`)
  await writeStoredFile(filePath, buffer)
  return { path: filePath, sha256: sha256Hex(buffer), sizeBytes: buffer.length, mimeType }
}

export async function writeStoredFile(filePath: string, plain: Buffer | Uint8Array): Promise<void> {
  await writeFile(filePath, encryptBuffer(Buffer.from(plain)))
}

export async function readStoredFile(filePath: string): Promise<Buffer> {
  return decryptBuffer(await readFile(filePath))
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return Object.entries(EXTENSIONS).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream'
}

/** Renvoie un fichier stocké (déchiffré à la volée) — à n'appeler qu'après contrôle d'accès. */
export async function sendStoredFile(res: Response, filePath: string, contentType?: string): Promise<void> {
  const data = await readStoredFile(filePath)
  res.setHeader('Cache-Control', 'no-store')
  res.type(contentType ?? contentTypeFor(filePath)).send(data)
}
