import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requestMeta } from '../../lib/actor.js'
import { uploadComparisonFile } from '../../lib/storage.js'
import * as verifyService from './service.js'

// Rate limiting obligatoire sur tout /api/verify/* (API_CONTRACT.md § Conventions
// générales — risque d'énumération, endpoint public sans compte).
const verifyLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: true, legacyHeaders: false })

export const verifyRouter = Router()
verifyRouter.use(verifyLimiter)

// Routes à chemin fixe déclarées AVANT '/:code' pour ne pas être capturées par lui.
verifyRouter.get(
  '/cachet/certificat',
  asyncHandler(async (_req, res) => {
    res.json(await verifyService.getPublishedSealCertificate())
  }),
)

verifyRouter.post(
  '/recherche-par-fichier',
  uploadComparisonFile.single('fichier'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Le fichier PDF est requis.' } })
      return
    }
    res.json(await verifyService.findByFile(req.file.buffer, requestMeta(req)))
  }),
)

verifyRouter.get(
  '/:code/pages/:page',
  asyncHandler(async (req, res) => {
    const preview = await verifyService.getPagePreview(req.params.code, Number(req.params.page), String(req.query.k ?? ''), requestMeta(req))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Nombre-Pages', String(preview.total))
    res.type('application/pdf').send(Buffer.from(preview.bytes))
  }),
)

verifyRouter.get(
  '/:code',
  asyncHandler(async (req, res) => {
    res.json(await verifyService.verifyByCode(req.params.code, requestMeta(req)))
  }),
)

verifyRouter.post(
  '/:code/comparer',
  uploadComparisonFile.single('fichier'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Le fichier à comparer est requis.' } })
      return
    }
    // Fichier tiers gardé en mémoire le temps du calcul d'empreinte — jamais écrit sur disque.
    res.json(await verifyService.compareFile(req.params.code, req.file.buffer, requestMeta(req)))
  }),
)
