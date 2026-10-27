import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export interface SessionTokenPayload {
  sub: string
  organizationId: string
  roles: string[]
  /** Identifiant de la Session serveur — permet l'expiration sur inactivité et la déconnexion effective. */
  sid: string
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
}

export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.jwtSecret) as SessionTokenPayload
}
