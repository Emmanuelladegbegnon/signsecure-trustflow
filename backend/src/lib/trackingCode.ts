import { randomBytes } from 'node:crypto'

// Alphabet sans caractères ambigus (0/O, 1/I/L) — code lisible à l'oral/à l'écrit.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Caractère de contrôle (Luhn mod 32 sur l'alphabet ci-dessus) : une faute de
 * frappe ou un code inventé/retouché à la main est détecté avant même toute
 * recherche. Ce n'est PAS un secret — l'algorithme est public (le front le
 * recalcule) ; il ne protège que contre l'erreur et la retouche grossière.
 */
export function checkCharacter(body: string): string {
  const n = ALPHABET.length
  let factor = 2
  let sum = 0
  for (let i = body.length - 1; i >= 0; i--) {
    const codePoint = ALPHABET.indexOf(body[i]!)
    if (codePoint < 0) throw new Error(`Caractère hors alphabet : ${body[i]}`)
    let addend = factor * codePoint
    factor = factor === 2 ? 1 : 2
    addend = Math.floor(addend / n) + (addend % n)
    sum += addend
  }
  return ALPHABET[(n - (sum % n)) % n]!
}

/**
 * Code de suivi public — toujours aléatoire côté serveur, jamais séquentiel ni
 * dérivé d'une donnée métier (CLAUDE.md § Verify). Format : SGN-XXXXXXXX-C,
 * C = caractère de contrôle calculé sur "SGNXXXXXXXX".
 */
export function generateTrackingCode(prefix: 'SGN' | 'TRC'): string {
  const bytes = randomBytes(8)
  let code = ''
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length]
  return `${prefix}-${code}-${checkCharacter(prefix + code)}`
}

export type TrackingCodeShape = 'valid' | 'legacy' | 'bad_check' | 'malformed'

/**
 * Forme d'un code saisi : `legacy` = code sans caractère de contrôle, émis
 * avant son introduction (toujours accepté) ; `bad_check` = faute de frappe
 * ou code retouché.
 */
export function inspectTrackingCode(raw: string): TrackingCodeShape {
  const code = raw.trim().toUpperCase()
  const withCheck = /^(SGN|TRC)-([A-HJ-NP-Z2-9]{8})-([A-HJ-NP-Z2-9])$/.exec(code)
  if (withCheck) {
    const [, prefix, body, check] = withCheck
    return checkCharacter(prefix! + body!) === check ? 'valid' : 'bad_check'
  }
  if (/^(SGN|TRC)-[A-HJ-NP-Z2-9]{8}$/.test(code)) return 'legacy'
  return 'malformed'
}
