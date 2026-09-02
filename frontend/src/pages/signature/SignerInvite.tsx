import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ApplySignature } from './ApplySignature'
import { SignatureOtp } from './SignatureOtp'
import { SignatureSuccess } from './SignatureSuccess'

interface LinkInfo {
  dossier: { titre: string; type: string; page: number }
  pdfUrl: string
  zoneSignature: { page: number; x: number; y: number }
}

interface SignatureSubmitResult {
  otpRequired: true
}

interface OtpVerifyResult {
  success: true
  dossierId: string
  trackingCode: string
}

type Step =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'sign' }
  | { kind: 'otp' }
  | { kind: 'success'; dossierId: string; trackingCode: string }

/**
 * Point d'entrée réel du signataire externe : /signer/:token.
 *
 * Conformément à CLAUDE.md (§ Sign), le signataire n'a pas de compte et
 * atterrit directement ici depuis le lien à usage unique reçu par email —
 * jamais via la navigation interne. Tout le parcours (dessin → consentement
 * → OTP → confirmation) se déroule sur cette même URL, sans navigation
 * router intermédiaire, puisqu'il s'agit d'une seule session de token.
 */
export function SignerInvite() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState<Step>({ kind: 'loading' })
  const [dossier, setDossier] = useState<LinkInfo['dossier'] | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!token) {
      setStep({ kind: 'error', message: 'Ce lien de signature est incomplet.' })
      return
    }
    const controller = new AbortController()
    apiRequest<LinkInfo>(`/sign/link/${token}`, { auth: false, signal: controller.signal })
      .then((info) => {
        setDossier(info.dossier)
        setStep({ kind: 'sign' })
      })
      .catch((err) => {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Ce lien de signature n'est pas reconnu, a déjà été utilisé, ou a expiré."
        setStep({ kind: 'error', message })
      })
    return () => controller.abort()
  }, [token])

  const handleSignatureSubmit = async (consentement: true, signatureImageBase64: string) => {
    setSignError(null)
    setSigning(true)
    try {
      // L'image transite directement dans le corps de cette requête et n'est
      // jamais assignée à un état React ni conservée après cet appel.
      await apiRequest<SignatureSubmitResult>(`/sign/link/${token}/signature`, {
        method: 'POST',
        body: { signatureImageBase64, consentement },
        auth: false,
      })
      setStep({ kind: 'otp' })
    } catch (err) {
      setSignError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSigning(false)
    }
  }

  const handleOtpSubmit = async (code: string) => {
    setOtpError(null)
    setVerifying(true)
    try {
      const result = await apiRequest<OtpVerifyResult>(`/sign/link/${token}/otp/verify`, {
        method: 'POST',
        body: { code },
        auth: false,
      })
      setStep({ kind: 'success', dossierId: result.dossierId, trackingCode: result.trackingCode })
    } catch (err) {
      setOtpError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setVerifying(false)
    }
  }

  if (step.kind === 'loading') return <FullscreenSpinner />

  if (step.kind === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-margin-mobile">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-4">
            <Icon name="link_off" className="text-on-error-container" size={28} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Lien de signature invalide</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{step.message}</p>
        </div>
      </div>
    )
  }

  if (step.kind === 'sign') {
    return <ApplySignature documentTitle={dossier?.titre ?? 'Document'} onSubmit={handleSignatureSubmit} submitting={signing} error={signError} />
  }

  if (step.kind === 'otp') {
    return <SignatureOtp documentTitle={dossier?.titre ?? 'Document'} onSubmit={handleOtpSubmit} submitting={verifying} error={otpError} />
  }

  return <SignatureSuccess documentTitle={dossier?.titre ?? 'Document'} trackingCode={step.trackingCode} dossierId={step.dossierId} />
}
