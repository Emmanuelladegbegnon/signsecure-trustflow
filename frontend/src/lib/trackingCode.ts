// Contrôle local du code de suivi — même algorithme public que le serveur
// (backend/src/lib/trackingCode.ts, Luhn mod 32). Signale une faute de frappe
// ou un code retouché avant tout appel réseau ; ne prouve rien d'autre.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function checkCharacter(body: string): string {
  const n = ALPHABET.length
  let factor = 2
  let sum = 0
  for (let i = body.length - 1; i >= 0; i--) {
    let addend = factor * ALPHABET.indexOf(body[i]!)
    factor = factor === 2 ? 1 : 2
    addend = Math.floor(addend / n) + (addend % n)
    sum += addend
  }
  return ALPHABET[(n - (sum % n)) % n]!
}

export type TrackingCodeShape = 'valid' | 'legacy' | 'bad_check' | 'malformed'

export function inspectTrackingCode(raw: string): TrackingCodeShape {
  const code = raw.trim().toUpperCase()
  const match = /^(SGN|TRC)-([A-HJ-NP-Z2-9]{8})-([A-HJ-NP-Z2-9])$/.exec(code)
  if (match) return checkCharacter(match[1]! + match[2]!) === match[3] ? 'valid' : 'bad_check'
  if (/^(SGN|TRC)-[A-HJ-NP-Z2-9]{8}$/.test(code)) return 'legacy'
  return 'malformed'
}
