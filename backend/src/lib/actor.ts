import type { Request } from 'express'

/** Construit le contexte "acteur" (identité + IP) pour l'audit et la couche métier, à partir d'une requête authentifiée. */
export function actorFromAuth(req: Request) {
  const auth = req.auth!
  return { id: auth.sub, organizationId: auth.organizationId, label: `${auth.prenom} ${auth.nom}`, ip: req.ip ?? '' }
}
