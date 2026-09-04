import { env } from '../env.js'

export interface OtpDeliveryParams {
  channel: 'sms' | 'email'
  destination: string
  code: string
}

export interface OtpProvider {
  send(params: OtpDeliveryParams): Promise<void>
}

/**
 * Provider de démonstration : journalise le code côté serveur uniquement (jamais
 * renvoyé au client — voir modules/auth et modules/sign). Aucun compte
 * Twilio/SendGrid n'est requis pour faire tourner ce MVP. Pour un vrai envoi,
 * implémenter un autre OtpProvider ici et le sélectionner via OTP_PROVIDER.
 */
class ConsoleOtpProvider implements OtpProvider {
  async send({ channel, destination, code }: OtpDeliveryParams): Promise<void> {
    console.log(`[OTP:${channel}] → ${destination} : ${code}`)
  }
}

/**
 * Provider de test : capture les codes envoyés en mémoire (au lieu de les
 * journaliser) pour permettre aux tests d'asserter le parcours OTP de bout en
 * bout sans jamais lire le hash stocké en base — exactement le point
 * d'observation qu'aurait un vrai fournisseur SMS/email.
 */
class TestOtpProvider implements OtpProvider {
  sent: OtpDeliveryParams[] = []
  async send(params: OtpDeliveryParams): Promise<void> {
    this.sent.push(params)
  }
  lastCodeFor(destination: string): string | undefined {
    return [...this.sent].reverse().find((p) => p.destination === destination)?.code
  }
}

let provider: OtpProvider | null = null

export function getOtpProvider(): OtpProvider {
  if (!provider) {
    switch (env.otpProvider) {
      case 'test':
        provider = new TestOtpProvider()
        break
      case 'console':
      default:
        provider = new ConsoleOtpProvider()
    }
  }
  return provider
}

/** Réservé aux tests — accès typé au provider de capture. */
export function getTestOtpProvider(): TestOtpProvider {
  const p = getOtpProvider()
  if (!(p instanceof TestOtpProvider)) throw new Error('OTP_PROVIDER doit valoir "test" pour utiliser ce helper.')
  return p
}
