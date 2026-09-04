/**
 * Envoi d'email "métier" (invitation de compte, lien de signature) — distinct
 * des OTP (voir otpProvider.ts). Même choix MVP : journalisation serveur
 * uniquement, aucun compte SMTP/SendGrid requis pour faire tourner le projet.
 * Remplacer sendEmail par un vrai envoi en branchant un provider ici.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[EMAIL] → ${to} | ${subject}\n${body}`)
}
