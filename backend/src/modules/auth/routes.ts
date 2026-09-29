import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth } from '../../middleware/auth.js'
import { requestMeta } from '../../lib/actor.js'
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
    res.json(await authService.verifyLoginOtp(req.body.email, req.body.code, requestMeta(req)))
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
    res.json(await authService.logout(req.auth!.sub, req.auth!.organizationId, req.auth!.sid, requestMeta(req)))
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getMe(req.auth!.sub))
  }),
)
