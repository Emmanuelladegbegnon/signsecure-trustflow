/**
 * Stockage disque des fichiers (PDF Sign, photos Trace). Jamais servi en
 * accès statique direct (CLAUDE.md § Sécurité) — toujours lu depuis un
 * handler authentifié qui vérifie l'organisation avant de streamer le
 * fichier (voir les routes de chaque module, fonction serveFichier).
 */
import { existsSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { env } from '../env.js'

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export const documentsDir = path.resolve(env.uploadDir, 'documents')
export const traceDir = path.resolve(env.uploadDir, 'trace')
export const incidentsDir = path.resolve(env.uploadDir, 'incidents')
ensureDir(documentsDir)
ensureDir(traceDir)
ensureDir(incidentsDir)

function namedStorage(dir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  })
}

export const uploadPdf = multer({
  storage: namedStorage(documentsDir),
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export const uploadImages = multer({
  storage: namedStorage(traceDir),
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
})

export const uploadIncidentPhoto = multer({
  storage: namedStorage(incidentsDir),
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
  limits: { fileSize: 10 * 1024 * 1024 },
})

/** Fichier soumis pour comparaison (Verify) — PDF (Sign) ou photo/scan (Trace), stocké temporairement le temps du calcul. */
export const uploadComparisonFile = multer({
  storage: namedStorage(documentsDir),
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')),
  limits: { fileSize: 10 * 1024 * 1024 },
})
