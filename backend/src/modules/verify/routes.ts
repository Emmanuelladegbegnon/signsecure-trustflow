import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { readFile, unlink } from 'node:fs/promises'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { uploadComparisonFile } from '../../lib/storage.js'
import * as verifyService from './service.js'

// Rate limiting obligatoire sur tout /api/verify/* (API_CONTRACT.md § Conventions
// générales — risque d'énumération, endpoint public sans compte).
const verifyLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: true, legacyHeaders: false })

export const verifyRouter = Router()
verifyRouter.use(verifyLimiter)

verifyRouter.get(
  '/:code',
  asyncHandler(async (req, res) => {
    res.json(await verifyService.verifyByCode(req.params.code, req.ip ?? ''))
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
    try {
      const buffer = await readFile(req.file.path)
      res.json(await verifyService.compareFile(req.params.code, buffer, req.ip ?? ''))
    } finally {
      // Fichier tiers soumis pour une comparaison ponctuelle — pas de raison de le conserver au-delà du calcul.
      await unlink(req.file.path).catch(() => undefined)
    }
  }),
)
