import type { SessionTokenPayload } from '../lib/jwt.js'

/** req.auth — SessionTokenPayload enrichi par requireAuth avec le nom/prénom lus en base (évite un aller-retour DB supplémentaire pour libeller l'audit). */
export interface AuthenticatedUser extends SessionTokenPayload {
  nom: string
  prenom: string
}

declare global {
  namespace Express {
    interface Request {
      /** Présent uniquement derrière le middleware requireAuth. */
      auth?: AuthenticatedUser
    }
  }
}

export {}
