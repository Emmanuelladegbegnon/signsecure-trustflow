import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { uploadPdf } from '../../lib/storage.js'
import { ApiError } from '../../lib/errors.js'
import { actorFromAuth } from '../../lib/actor.js'
import {
  applySignatureSchema,
  assignSignatoriesSchema,
  createDocumentSchema,
  revokeDocumentSchema,
  signOtpVerifySchema,
} from './schemas.js'
import * as signService from './service.js'

/** Monté sur /api/documents — actions authentifiées côté émetteur du dossier. */
export const documentsRouter = Router()

documentsRouter.post(
  '/',
  requireAuth,
  uploadPdf.single('fichier'),
  validateBody(createDocumentSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('MISSING_FILE', 'Le fichier PDF est requis.')
    const actor = actorFromAuth(req)
    res.status(201).json(await signService.createDocument(req.file, req.body.titre, req.body.type, actor))
  }),
)

documentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { statut, type, date } = req.query as Record<string, string | undefined>
    res.json(await signService.listDocuments(req.auth!.organizationId, { statut, type, date }))
  }),
)

documentsRouter.post(
  '/:id/signataires',
  requireAuth,
  validateBody(assignSignatoriesSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFromAuth(req)
    res.json(await signService.assignSignatories(req.params.id, req.body.signataires, actor))
  }),
)

documentsRouter.post(
  '/:id/envoyer',
  requireAuth,
  asyncHandler(async (req, res) => {
    const actor = actorFromAuth(req)
    res.json(await signService.sendDocument(req.params.id, actor))
  }),
)

documentsRouter.get(
  '/:id/rapport-preuve',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await signService.getProofReport(req.params.id, req.auth!.organizationId))
  }),
)

documentsRouter.post(
  '/:id/revoquer',
  requireAuth,
  requireRole('SUPERVISEUR'),
  validateBody(revokeDocumentSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFromAuth(req)
    res.json(await signService.revokeDocument(req.params.id, req.body.motif, actor))
  }),
)

/** Monté sur /api/sign/link — parcours public du signataire, autorisé par le token lui-même. */
export const signLinkRouter = Router()

signLinkRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    res.json(await signService.getLinkInfo(req.params.token))
  }),
)

signLinkRouter.get(
  '/:token/fichier',
  asyncHandler(async (req, res) => {
    const filePath = await signService.getLinkFilePath(req.params.token)
    res.sendFile(filePath)
  }),
)

signLinkRouter.post(
  '/:token/signature',
  validateBody(applySignatureSchema),
  asyncHandler(async (req, res) => {
    res.json(await signService.applySignature(req.params.token, req.body.signatureImageBase64, req.ip ?? ''))
  }),
)

signLinkRouter.post(
  '/:token/otp/verify',
  validateBody(signOtpVerifySchema),
  asyncHandler(async (req, res) => {
    res.json(await signService.verifySignatureOtp(req.params.token, req.body.code, req.ip ?? ''))
  }),
)
