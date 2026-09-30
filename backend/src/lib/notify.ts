import { env } from '../env.js'
import { sendRealEmail } from './mailer.js'

/**
 * Envoi d'email "métier" (invitation de compte, lien de signature) — distinct
 * des OTP (voir otpProvider.ts). Contrôlé par EMAIL_PROVIDER : "console"
 * (défaut) journalise côté serveur sans compte SMTP requis ; "smtp" envoie un
 * vrai email via mailer.ts (voir .env.example pour les variables SMTP_*).
 */
/** Emails capturés quand EMAIL_PROVIDER="test" (tests automatisés uniquement). */
export const sentTestEmails: Array<{ to: string; subject: string; body: string }> = []

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (env.emailProvider === 'test') {
    sentTestEmails.push({ to, subject, body })
    return
  }
  if (env.emailProvider === 'smtp') {
    await sendRealEmail(to, subject, body)
    return
  }
  console.log(`[EMAIL] → ${to} | ${subject}\n${body}`)
}
