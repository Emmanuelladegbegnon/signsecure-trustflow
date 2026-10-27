import { env } from '../env.js'
import { sendRealEmail } from './mailer.js'
import { OTP_TTL_MINUTES } from './otp.js'

export type OtpChannel = 'sms' | 'email'

export interface OtpDeliveryParams {
  channel: OtpChannel
  destination: string
  code: string
  /** Contexte du code, pour un message adapté (connexion interne ou validation de signature). */
  purpose?: 'login' | 'signature'
}

export interface OtpProvider {
  send(params: OtpDeliveryParams): Promise<void>
}

function messageFor({ code, purpose }: OtpDeliveryParams): { subject: string; text: string } {
  if (purpose === 'signature') {
    return {
      subject: 'Code de validation de votre signature — SignSecure TrustFlow',
      text: `SignSecure : votre code de validation de signature est ${code}. Il expire dans ${OTP_TTL_MINUTES} min. Ne le communiquez à personne.`,
    }
  }
  return {
    subject: 'Votre code de connexion SignSecure TrustFlow',
    text: `Votre code de vérification est : ${code}\n\nCe code expire dans ${OTP_TTL_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
  }
}

// ------------------------------------------------------------- Canal email ---

/** Journalise le code côté serveur uniquement (jamais renvoyé au client). */
class ConsoleEmailSender implements OtpProvider {
  async send({ destination, code }: OtpDeliveryParams): Promise<void> {
    console.log(`[OTP:email] → ${destination} : ${code}`)
  }
}

/** Envoi réel via SMTP (mailer.ts), sélectionné par OTP_PROVIDER="smtp". */
class SmtpEmailSender implements OtpProvider {
  async send(params: OtpDeliveryParams): Promise<void> {
    const { subject, text } = messageFor(params)
    await sendRealEmail(params.destination, subject, text)
  }
}

// --------------------------------------------------------------- Canal SMS ---

/**
 * SMS de SIMULATION : aucun SMS ne part réellement, le message est journalisé
 * côté serveur avec une étiquette explicite. Permet de démontrer un second
 * canal distinct de l'email sans compte chez un opérateur.
 */
class SimulatedSmsSender implements OtpProvider {
  async send(params: OtpDeliveryParams): Promise<void> {
    console.log(`[SMS — SIMULATION, aucun SMS réellement envoyé] → ${params.destination} : ${messageFor(params).text}`)
  }
}

/** Envoi réel via l'API REST Twilio (SMS_PROVIDER="twilio"), sans dépendance supplémentaire. */
class TwilioSmsSender implements OtpProvider {
  async send(params: OtpDeliveryParams): Promise<void> {
    const { twilioAccountSid: sid, twilioAuthToken: token, twilioFrom: from } = env
    if (!sid || !token || !from) {
      throw new Error('Configuration Twilio incomplète : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM sont requis (voir .env.example).')
    }
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: params.destination, From: from, Body: messageFor(params).text }),
    })
    if (!response.ok) {
      // Ne jamais journaliser le code lui-même en cas d'échec.
      throw new Error(`Échec de l'envoi SMS via Twilio (HTTP ${response.status}).`)
    }
  }
}

// ------------------------------------------------------------------- Tests ---

/**
 * Provider de test : capture les codes envoyés (SMS et email) en mémoire pour
 * permettre aux tests d'asserter le parcours OTP de bout en bout sans jamais
 * lire le hash stocké en base.
 */
class TestOtpProvider implements OtpProvider {
  sent: OtpDeliveryParams[] = []
  async send(params: OtpDeliveryParams): Promise<void> {
    this.sent.push(params)
  }
  lastCodeFor(destination: string, channel?: OtpChannel): string | undefined {
    return [...this.sent].reverse().find((p) => p.destination === destination && (!channel || p.channel === channel))?.code
  }
}

// ---------------------------------------------------------------- Routage ---

/** Aiguille chaque envoi vers le canal demandé — un SMS ne passe jamais par l'email, et inversement. */
class ChannelRouter implements OtpProvider {
  constructor(
    private readonly email: OtpProvider,
    private readonly sms: OtpProvider,
  ) {}
  async send(params: OtpDeliveryParams): Promise<void> {
    await (params.channel === 'sms' ? this.sms : this.email).send(params)
  }
}

let provider: OtpProvider | null = null

export function getOtpProvider(): OtpProvider {
  if (!provider) {
    if (env.otpProvider === 'test') {
      provider = new TestOtpProvider()
    } else {
      const email = env.otpProvider === 'smtp' ? new SmtpEmailSender() : new ConsoleEmailSender()
      const sms = env.smsProvider === 'twilio' ? new TwilioSmsSender() : new SimulatedSmsSender()
      provider = new ChannelRouter(email, sms)
    }
  }
  return provider
}

/** true si les SMS sont simulés — affiché au signataire pour rester honnête sur la démonstration. */
export function isSmsSimulated(): boolean {
  return env.otpProvider === 'test' || env.smsProvider !== 'twilio'
}

/** Réservé aux tests — accès typé au provider de capture. */
export function getTestOtpProvider(): TestOtpProvider {
  const p = getOtpProvider()
  if (!(p instanceof TestOtpProvider)) throw new Error('OTP_PROVIDER doit valoir "test" pour utiliser ce helper.')
  return p
}
