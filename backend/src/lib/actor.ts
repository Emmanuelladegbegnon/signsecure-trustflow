import type { Request } from 'express'

/** Acteur authentifié d'une action métier — identité, organisation et contexte réseau pour l'audit. */
export interface Actor {
  id: string
  organizationId: string
  label: string
  ip: string
  userAgent?: string | null
}

/** Métadonnées réseau d'une requête, jointes aux événements d'audit. */
export function requestMeta(req: Request) {
  return { ip: req.ip ?? '', userAgent: req.get('user-agent') ?? null }
}

/** Construit le contexte "acteur" (identité + IP + navigateur) pour l'audit et la couche métier, à partir d'une requête authentifiée. */
export function actorFromAuth(req: Request): Actor {
  const auth = req.auth!
  return { id: auth.sub, organizationId: auth.organizationId, label: `${auth.prenom} ${auth.nom}`, ...requestMeta(req) }
}
