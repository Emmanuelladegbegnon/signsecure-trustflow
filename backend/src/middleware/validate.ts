import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { ApiError } from '../lib/errors.js'

/** Valide req.body contre un schéma zod ; remplace req.body par la version parsée (types coercés/nettoyés). */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const first = result.error.issues[0]
      throw ApiError.badRequest('VALIDATION_ERROR', first ? `${first.path.join('.')}: ${first.message}` : 'Requête invalide.')
    }
    req.body = result.data
    next()
  }
}
