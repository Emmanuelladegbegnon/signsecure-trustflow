import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { actorFromAuth } from '../../lib/actor.js'
import { ApiError } from '../../lib/errors.js'
import { uploadImages, uploadIncidentPhoto } from '../../lib/storage.js'
import { renderTrackingLabelSvg } from './label.js'
import { incidentSchema, observationsSchema, registerTraceSchema, transferRequestSchema } from './schemas.js'
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
      .json(await traceService.reportIncident(req.params.id, { ...req.body, photoPath: req.file?.path }, actorFromAuth(req)))
  }),
)

traceRouter.get(
  '/:id/timeline',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await traceService.getTimeline(req.params.id, req.auth!.organizationId))
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
