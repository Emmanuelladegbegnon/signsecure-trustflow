/**
 * Cookie de session : le jeton n'est plus jamais lisible par le JavaScript de
 * la page (httpOnly). Un script malveillant injecté dans l'interface ne peut
 * donc pas le voler pour ouvrir une session ailleurs.
 *
 * Protection CSRF : SameSite=Strict (le navigateur n'envoie pas le cookie
 * depuis un autre site) + en-tête X-Requested-With exigé sur toute requête qui
 * modifie des données (un autre site ne peut pas l'ajouter sans autorisation
 * CORS, réservée à l'origine du front).
 */
import type { Request, Response } from 'express'
import { env } from '../env.js'

export const SESSION_COOKIE = 'ss_session'
export const CSRF_HEADER = 'x-requested-with'
export const CSRF_VALUE = 'SignSecure'

function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim())
  if (!match) return 2 * 3_600_000
  const n = Number(match[1])
  const unit = match[2] ?? 's'
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/api',
    maxAge: parseDurationMs(env.jwtExpiresIn),
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: env.cookieSecure, sameSite: 'strict', path: '/api' })
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='))
  }
  return null
}
