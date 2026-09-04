import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Enveloppe un handler async pour transmettre ses rejets à errorHandler plutôt que de faire planter le process. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
