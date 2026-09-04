import { z } from 'zod'

export const createDocumentSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis.'),
  type: z.string().min(1, 'Le type est requis.'),
})

const zoneSchema = z.object({
  page: z.coerce.number().int().min(1),
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
})

export const assignSignatoriesSchema = z.object({
  signataires: z
    .array(
      z.object({
        nom: z.string().min(1),
        email: z.string().email(),
        telephone: z.string().min(1),
        zone: zoneSchema,
      }),
    )
    .min(1, 'Au moins un signataire est requis.'),
})

export const applySignatureSchema = z.object({
  signatureImageBase64: z.string().min(1, 'La signature est requise.'),
  consentement: z.literal(true, { message: 'Le consentement explicite est requis.' }),
})

export const signOtpVerifySchema = z.object({
  code: z.string().length(6),
})

export const revokeDocumentSchema = z.object({
  motif: z.string().min(1, 'Le motif est requis.'),
})

export const listDocumentsQuerySchema = z.object({
  statut: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional(),
})
