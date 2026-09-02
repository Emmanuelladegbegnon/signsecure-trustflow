import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { OtpInputGroup } from '../../components/ui/OtpInputGroup'
import { ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

interface LocationState {
  email: string
  otpChannel: 'sms' | 'email'
}

export function OtpLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyOtp, resendOtp } = useAuth()
  const state = location.state as LocationState | null

  const [code, setCode] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  // Pas de code (email) en state : l'utilisateur n'est pas passé par /connexion
  // dans cette session — on ne devine jamais un email, on renvoie au login.
  if (!state?.email) {
    return <Navigate to={ROUTES.login} replace />
  }

  const { email, otpChannel } = state

  const handleSubmit = async () => {
    if (!complete || submitting) return
    setApiError(null)
    setSubmitting(true)
    try {
      await verifyOtp(email, code)
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setApiError(null)
    setResendState('sending')
    try {
      await resendOtp(email)
      setResendState('sent')
    } catch (err) {
      setResendState('idle')
      setApiError(err instanceof ApiRequestError ? err.message : "Impossible de renvoyer le code pour l'instant.")
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop antialiased">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Icon name="verified" filled size={32} />
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight">SignSecure TrustFlow</span>
        </div>
      </div>
      <main className="w-full max-w-[420px]">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] p-8 border border-surface-variant flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center text-primary mb-6">
            <Icon name="lock_clock" size={32} />
          </div>
          <div className="text-center mb-6">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Vérification en deux étapes</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Un code a été envoyé par {otpChannel === 'sms' ? 'SMS' : 'email'} à <span className="font-label-md text-label-md text-on-surface">{email}</span>
            </p>
          </div>

          {apiError && (
            <div className="w-full mb-6">
              <FormAlert tone="error">{apiError}</FormAlert>
            </div>
          )}

          <form
            className="w-full flex flex-col gap-8"
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <OtpInputGroup
              length={6}
              onChange={(value, isComplete) => {
                setCode(value)
                setComplete(isComplete)
              }}
            />
            <button
              className={`w-full py-3 px-4 font-label-md text-label-md rounded flex items-center justify-center gap-2 transition-all ${
                complete && !submitting ? 'bg-primary text-on-primary hover:bg-primary-fixed-dim/90 hover:text-on-primary-fixed' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
              }`}
              disabled={!complete || submitting}
              type="submit"
            >
              {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {submitting ? 'Vérification…' : 'Valider'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {resendState === 'sent' ? (
              <p className="font-body-sm text-body-sm text-primary flex items-center justify-center gap-1">
                <Icon name="check_circle" filled size={16} />
                Nouveau code envoyé.
              </p>
            ) : (
              <button
                className="font-label-sm text-label-sm text-primary hover:underline underline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                onClick={handleResend}
                disabled={resendState === 'sending'}
                type="button"
              >
                {resendState === 'sending' ? 'Envoi…' : 'Code non reçu ? Renvoyer le code'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
