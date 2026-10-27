import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth } from '../../middleware/auth.js'
import { actorFromAuth, requestMeta } from '../../lib/actor.js'
import { requestReauth, verifyReauth } from './reauth.js'
import { clearSessionCookie, setSessionCookie } from '../../lib/sessionCookie.js'
import { z } from 'zod'
import { validateBody } from '../../middleware/validate.js'
import { activateAccountSchema, loginSchema, otpResendSchema, otpVerifySchema } from './schemas.js'
import * as authService from './service.js'

export const authRouter = Router()

authRouter.get(
  '/invitation/:token',
  asyncHandler(async (req, res) => {
    res.json(await authService.getInvitation(req.params.token))
  }),
)

authRouter.post(
  '/invitation/:token/activer',
  validateBody(activateAccountSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.activateAccount(req.params.token, req.body.password, requestMeta(req)))
  }),
)

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.login(req.body.email, req.body.password, requestMeta(req)))
  }),
)

authRouter.post(
  '/otp/verify',
  validateBody(otpVerifySchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await authService.verifyLoginOtp(req.body.email, req.body.code, requestMeta(req))
    // Le jeton part uniquement dans un cookie httpOnly, jamais dans la réponse JSON.
    setSessionCookie(res, token)
    res.json({ user })
  }),
)

authRouter.post(
  '/otp/resend',
  validateBody(otpResendSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.resendLoginOtp(req.body.email))
  }),
)

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.auth!.sub, req.auth!.organizationId, req.auth!.sid, requestMeta(req))
    clearSessionCookie(res)
    res.json(result)
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getMe(req.auth!.sub))
  }),
)

/** Reconfirmation avant action sensible : envoi d'un code, puis vérification. */
authRouter.post(
  '/reconfirmation',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await requestReauth(actorFromAuth(req)))
  }),
)

authRouter.post(
  '/reconfirmation/verifier',
  requireAuth,
  validateBody(z.object({ code: z.string().length(6) })),
  asyncHandler(async (req, res) => {
    res.json(await verifyReauth(actorFromAuth(req), req.auth!.sid, req.body.code))
  }),
)
