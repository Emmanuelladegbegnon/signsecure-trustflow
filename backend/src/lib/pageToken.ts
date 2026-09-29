/**
 * Jeton de page imprimé dans le QR de chaque page du PDF final.
 *
 * Il lie un QR à UN code de suivi et à UNE page : scanner le QR de la page 2
 * ouvre l'aperçu scellé de la page 2 de CE document. Conséquences :
 *  - une page substituée dont on a recopié le QR fait apparaître la vraie
 *    page : la différence se voit à l'œil ;
 *  - un code de suivi retouché à côté d'un QR intact ne correspond plus au
 *    jeton, et un QR fabriqué pour un autre code n'a pas de jeton valide.
 *
 * HMAC-SHA256 tronqué à 96 bits : impossible à deviner, rien à stocker. Le
 * secret est distinct du secret de session (PAGE_TOKEN_SECRET).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../env.js'

export function pageToken(trackingCode: string, page: number): string {
  return createHmac('sha256', env.pageTokenSecret).update(`${trackingCode}:${page}`).digest('base64url').slice(0, 16)
}

export function isValidPageToken(trackingCode: string, page: number, token: string): boolean {
  const expected = Buffer.from(pageToken(trackingCode, page))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
