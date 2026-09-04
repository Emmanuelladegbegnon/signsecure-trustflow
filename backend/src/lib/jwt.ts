import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export interface SessionTokenPayload {
  sub: string
  organizationId: string
  roles: string[]
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
}

export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.jwtSecret) as SessionTokenPayload
}
