import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../lib/errors.js'

/** Doit être monté en dernier — normalise toute erreur au format { error: { code, message } } d'API_CONTRACT.md. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Une erreur inattendue est survenue.' } })
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint introuvable.' } })
}
