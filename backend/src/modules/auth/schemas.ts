import { z } from 'zod'

export const activateAccountSchema = z.object({
  // Règle complète (longueur, mots de passe courants, nom/email) appliquée dans le service, qui connaît la personne.
  password: z.string().min(1, 'Le mot de passe est requis.').max(128),
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
