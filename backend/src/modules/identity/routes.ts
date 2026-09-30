import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { actorFromAuth } from '../../lib/actor.js'
import { sendStoredFile } from '../../lib/storage.js'
import { requireRecentReauth } from '../auth/reauth.js'
import * as identityService from './service.js'

/** Monté sur /api/identites — contrôle des pièces d'identité par l'organisation. */
export const identityRouter = Router()
identityRouter.use(requireAuth, requireRole('VERIFICATEUR', 'SUPERVISEUR'))

identityRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await identityService.listPendingIdentityChecks(req.auth!.organizationId))
  }),
)

identityRouter.get(
  '/:signataireId/piece/:face',
  asyncHandler(async (req, res) => {
    const file = await identityService.getIdentityImage(req.params.signataireId, req.params.face, actorFromAuth(req))
    await sendStoredFile(res, file.path, file.mimeType)
  }),
)

identityRouter.post(
  '/:signataireId/decision',
  requireRecentReauth,
  validateBody(
    z.object({
      decision: z.enum(['VALIDEE', 'REFUSEE']),
      nomConforme: z.boolean(),
      motif: z.string().max(500).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await identityService.decideIdentityCheck(req.params.signataireId, req.body, actorFromAuth(req)))
  }),
)
