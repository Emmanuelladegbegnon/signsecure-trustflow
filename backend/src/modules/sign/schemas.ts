import { z } from 'zod'

export const createDocumentSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis.'),
  type: z.string().min(1, 'Le type est requis.'),
  // multipart/form-data : booléen transmis sous forme de chaîne.
  sensible: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
  controleIdentite: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
})

export const identitySubmitSchema = z.object({
  typePiece: z.enum(['CNI', 'CIP', 'PASSEPORT', 'PERMIS', 'CARTE_CONSULAIRE', 'AUTRE']),
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

export const startOwnSignatureSchema = z.object({
  zone: zoneSchema,
})

export const applySignatureSchema = z.object({
  signatureImageBase64: z.string().min(1, 'La signature est requise.'),
  consentement: z.literal(true, { message: 'Le consentement explicite est requis.' }),
})

export const signOtpVerifySchema = z.object({
  /** Code reçu par SMS. */
  code: z.string().length(6),
  /** Code reçu par email — exigé en plus pour un document marqué sensible. */
  codeEmail: z.string().length(6).optional(),
})

export const revokeDocumentSchema = z.object({
  motif: z.string().min(1, 'Le motif est requis.'),
})

export const listDocumentsQuerySchema = z.object({
  statut: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional(),
})
