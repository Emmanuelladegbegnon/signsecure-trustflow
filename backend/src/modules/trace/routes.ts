import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { actorFromAuth } from '../../lib/actor.js'
import { ApiError } from '../../lib/errors.js'
import { sendStoredFile, uploadComparisonFile, uploadImages, uploadIncidentPhoto } from '../../lib/storage.js'
import { renderTrackingLabelSvg } from './label.js'
import { comparisonSchema, incidentSchema, observationsSchema, registerTraceSchema, transferRequestSchema } from './schemas.js'
import * as traceService from './service.js'

export const traceRouter = Router()

traceRouter.post(
  '/enregistrement',
  requireAuth,
  validateBody(registerTraceSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await traceService.registerDocument(req.body, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/:id/observations',
  requireAuth,
  validateBody(observationsSchema),
  asyncHandler(async (req, res) => {
    res.json(await traceService.recordObservations(req.params.id, req.body, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/:id/capture',
  requireAuth,
  uploadImages.array('photos', 20),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) throw ApiError.badRequest('MISSING_FILES', 'Au moins une photo est requise.')
    res.json(await traceService.captureArtifacts(req.params.id, files, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/:id/valider',
  requireAuth,
  requireRole('SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    res.json(await traceService.validateDocument(req.params.id, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/:id/transfert',
  requireAuth,
  validateBody(transferRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await traceService.requestTransfer(req.params.id, req.body, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/transfert/:transfertId/confirmer',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.confirmTransfer(req.params.transfertId, actorFromAuth(req)))
  }),
)

traceRouter.post(
  '/:id/incident',
  requireAuth,
  uploadIncidentPhoto.single('photo'),
  validateBody(incidentSchema),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await traceService.reportIncident(req.params.id, { ...req.body, photo: req.file }, actorFromAuth(req)))
  }),
)

traceRouter.get(
  '/:id/timeline',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.getTimeline(req.params.id, req.auth!.organizationId))
  }),
)

traceRouter.get(
  '/:id/photos',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.listArtifacts(req.params.id, req.auth!.organizationId))
  }),
)

traceRouter.get(
  '/photos/:artifactId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = await traceService.getArtifactFile(req.params.artifactId, req.auth!.organizationId)
    await sendStoredFile(res, file.path, file.mimeType)
  }),
)

// Examen de concordance humain (option A) — réservé aux rôles de contrôle.
traceRouter.post(
  '/:id/comparaisons',
  requireAuth,
  requireRole('VERIFICATEUR', 'SUPERVISEUR'),
  uploadComparisonFile.single('fichier'),
  validateBody(comparisonSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('MISSING_FILE', 'La copie présentée (photo ou scan) est requise.')
    res.status(201).json(await traceService.recordComparison(req.params.id, req.file, req.body, actorFromAuth(req)))
  }),
)

traceRouter.get(
  '/:id/comparaisons',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.listComparisons(req.params.id, req.auth!.organizationId))
  }),
)

traceRouter.get(
  '/comparaisons/:comparaisonId/fichier',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = await traceService.getComparisonFile(req.params.comparaisonId, req.auth!.organizationId)
    await sendStoredFile(res, file.path, file.mimeType)
  }),
)

traceRouter.post(
  '/:id/archiver',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.archiveDocument(req.params.id, actorFromAuth(req)))
  }),
)

// Étiquette imprimable — voir label.ts (aucune donnée sensible, code déjà connu de l'appelant).
traceRouter.get('/etiquette/:trackingCode', (req, res) => {
  res.type('image/svg+xml').send(renderTrackingLabelSvg(req.params.trackingCode))
})
