import { useEffect, useState } from 'react'
import { PublicShell } from '../../components/layout/PublicShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { OtpInputGroup } from '../../components/ui/OtpInputGroup'
import { Stepper } from '../../components/ui/Stepper'
import { EXTERNAL_SIGNER_STEPS } from '../../constants/steps'

export interface OtpChannelInfo {
  canal: 'sms' | 'email'
  /** Destination masquée par le serveur (ex. "+229 •• •• 12 34"). */
  destination: string
}

export interface SignatureOtpCodes {
  code: string
  codeEmail?: string
}

interface SignatureOtpProps {
  documentTitle: string
  canaux: OtpChannelInfo[]
  smsSimulation: boolean
  onSubmit: (codes: SignatureOtpCodes) => Promise<void>
  onResend: () => Promise<void>
  submitting: boolean
  error: string | null
}

const RESEND_DELAY_SECONDS = 45

/**
 * Second facteur exigé juste avant la validation finale de la signature
 * (CLAUDE.md § Sign). Le code part par SMS, sur un canal distinct de l'email
 * qui a reçu le lien ; pour un document sensible, un second code est aussi
 * envoyé par email et les deux sont exigés.
 */
export function SignatureOtp({ documentTitle, canaux, smsSimulation, onSubmit, onResend, submitting, error }: SignatureOtpProps) {
  const needsEmail = canaux.some((c) => c.canal === 'email')
  const [smsCode, setSmsCode] = useState({ value: '', complete: false })
  const [emailCode, setEmailCode] = useState({ value: '', complete: false })
  const [cooldown, setCooldown] = useState(RESEND_DELAY_SECONDS)
  const [resending, setResending] = useState(false)
  const [resendInfo, setResendInfo] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const complete = smsCode.complete && (!needsEmail || emailCode.complete)

  const handleResend = async () => {
    setResendError(null)
    setResendInfo(null)
    setResending(true)
    try {
      await onResend()
      setResendInfo('Un nouveau code vous a été envoyé. Les codes précédents ne sont plus valables.')
      setCooldown(RESEND_DELAY_SECONDS)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Impossible de renvoyer le code.')
    } finally {
      setResending(false)
    }
  }

  const sms = canaux.find((c) => c.canal === 'sms')
  const email = canaux.find((c) => c.canal === 'email')

  return (
    <PublicShell withHeader>
      <div className="w-full max-w-[480px] flex flex-col gap-6">
        <Stepper steps={EXTERNAL_SIGNER_STEPS} currentStep={1} />
        <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant p-gutter flex flex-col gap-6">
          <div className="text-center flex flex-col gap-2">
            <div className="mx-auto w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-2">
              <Icon name="sms" filled size={28} className="text-primary" />
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Vérification de sécurité</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {needsEmail
                ? 'Ce document est marqué sensible : saisissez les deux codes reçus pour confirmer votre signature.'
                : 'Saisissez le code reçu par SMS pour confirmer votre signature.'}
            </p>
          </div>

          {smsSimulation && (
            <FormAlert tone="info">
              Démonstration : l'envoi de SMS est simulé sur ce serveur. Le code est visible dans les journaux du serveur, aucun SMS réel n'est envoyé.
            </FormAlert>
          )}

          <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center gap-4">
            <div className="bg-surface-container-lowest p-2 rounded-md shadow-sm border border-surface-variant shrink-0">
              <Icon name="description" filled className="text-secondary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Document à signer</span>
              <span className="font-body-md text-body-md font-medium text-on-surface truncate">{documentTitle}</span>
            </div>
          </div>

          {error && <FormAlert tone="error">{error}</FormAlert>}

          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (complete && !submitting) onSubmit({ code: smsCode.value, ...(needsEmail ? { codeEmail: emailCode.value } : {}) })
            }}
          >
            <div className="flex flex-col gap-2">
              <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                <Icon name="smartphone" size={18} />
                Code reçu par SMS{sms ? ` au ${sms.destination}` : ''}
              </span>
              <OtpInputGroup length={6} onChange={(value, isComplete) => setSmsCode({ value, complete: isComplete })} />
            </div>

            {needsEmail && (
              <div className="flex flex-col gap-2">
                <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                  <Icon name="mail" size={18} />
                  Code reçu par email{email ? ` (${email.destination})` : ''}
                </span>
                <OtpInputGroup length={6} onChange={(value, isComplete) => setEmailCode({ value, complete: isComplete })} />
              </div>
            )}

            <button
              className={`w-full font-label-md text-label-md py-4 px-6 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2 ${
                complete && !submitting ? 'bg-primary hover:bg-on-primary-fixed-variant text-on-primary' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
              }`}
              disabled={!complete || submitting}
              type="submit"
            >
              {submitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-on-surface-variant/40 border-t-on-surface-variant animate-spin" aria-hidden="true" />
              ) : (
                <Icon name="check_circle" size={20} />
              )}
              {submitting ? 'Vérification…' : 'Valider la signature'}
            </button>
          </form>

          {resendInfo && <FormAlert tone="success">{resendInfo}</FormAlert>}
          {resendError && <FormAlert tone="error">{resendError}</FormAlert>}
          <button
            type="button"
            className="font-label-md text-label-md text-primary hover:underline disabled:text-on-surface-variant disabled:no-underline self-center"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : resending ? 'Envoi…' : 'Renvoyer le code'}
          </button>

          <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
            SignSecure ne vous demandera jamais ce code par téléphone ou par email. Ne le communiquez à personne.
          </p>
        </div>
      </div>
    </PublicShell>
  )
}
