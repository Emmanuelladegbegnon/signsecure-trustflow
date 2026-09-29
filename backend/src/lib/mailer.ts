import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../env.js'

/**
 * Transport SMTP partagé par les OTP (otpProvider.ts) et les emails "métier"
 * (notify.ts — invitation de compte, lien de signature) quand le provider
 * choisi est "smtp". Un seul jeu de variables SMTP_* à configurer (voir
 * .env.example) — fonctionne avec n'importe quel fournisseur SMTP standard
 * (Brevo, Gmail via mot de passe d'application, etc.).
 */
let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!transporter) {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
      throw new Error(
        'Configuration SMTP incomplète : SMTP_HOST, SMTP_USER et SMTP_PASS sont requis pour envoyer de vrais emails (voir .env.example).',
      )
    }
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  }
  return transporter
}

export async function sendRealEmail(to: string, subject: string, text: string): Promise<void> {
  await getTransporter().sendMail({ from: env.smtpFrom, to, subject, text })
}
