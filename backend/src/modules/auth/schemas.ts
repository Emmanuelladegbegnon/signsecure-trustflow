import { z } from 'zod'

export const activateAccountSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export const otpResendSchema = z.object({
  email: z.string().email(),
})
