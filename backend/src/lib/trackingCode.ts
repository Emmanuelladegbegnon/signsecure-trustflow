import { randomBytes } from 'node:crypto'

// Alphabet sans caractères ambigus (0/O, 1/I/L) — code lisible à l'oral/à l'écrit.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Code de suivi public — toujours aléatoire côté serveur, jamais séquentiel ni dérivé d'une donnée métier (CLAUDE.md § Verify). */
export function generateTrackingCode(prefix: 'SGN' | 'TRC'): string {
  const bytes = randomBytes(8)
  let code = ''
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length]
  return `${prefix}-${code}`
}
