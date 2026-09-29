import { env } from '../env.js'

/**
 * Normalise un numéro saisi librement vers le format international E.164
 * attendu par les fournisseurs SMS ("+229 01 97 00 00 00" → "+2290197000000").
 * Un numéro sans indicatif reçoit DEFAULT_PHONE_COUNTRY_CODE (Bénin par défaut).
 * Retourne null si le résultat n'a pas une longueur plausible.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim()
  let digits = trimmed.replace(/[^\d]/g, '')
  if (trimmed.startsWith('00')) digits = digits.slice(2)
  else if (!trimmed.startsWith('+')) digits = `${env.defaultPhoneCountryCode}${digits}`
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

/** Masque un numéro pour l'affichage au signataire : "+229 •• •• •• 12 34". */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone) ?? phone
  return `${normalized.slice(0, 4)} •• •• ${normalized.slice(-4, -2)} ${normalized.slice(-2)}`
}

/** Masque une adresse email : "j••••@exemple.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  return `${local[0]}••••@${domain}`
}
