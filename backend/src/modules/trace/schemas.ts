import { z } from 'zod'

export const registerTraceSchema = z.object({
  type: z.string().min(1),
  titre: z.string().min(1),
  reference: z.string().optional(),
  organismeDeclare: z.string().optional(),
  dateIndiquee: z.string().min(1),
  nombrePages: z.coerce.number().int().positive().optional(),
  confidentialite: z.string().optional(),
  lieuReception: z.string().optional(),
})

export const observationsSchema = z.object({
  signaturePresente: z.boolean(),
  pagesCompletes: z.boolean(),
  cachetVisible: z.boolean(),
  documentLisible: z.boolean(),
  enveloppeIntacte: z.boolean(),
  anomalie: z.string().optional(),
})

export const transferRequestSchema = z.object({
  destinataireId: z.string().min(1),
  lieu: z.string().optional(),
  motif: z.string().optional(),
})

export const incidentSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
})
