import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FormAlert } from '../components/ui/FormAlert'
import { Icon } from '../components/ui/Icon'
import { OtpInputGroup } from '../components/ui/OtpInputGroup'
import { apiRequest, ApiRequestError, setReauthHandler } from '../lib/httpClient'

/**
 * Fenêtre de reconfirmation : quand le serveur répond REAUTH_REQUIRED à une
 * action sensible (révoquer un document, gérer des comptes ou des rôles), on
 * demande un code reçu par email, puis la requête d'origine est rejouée.
 * Un code valide ouvre une fenêtre de 5 minutes sur cette session.
 */
export function ReauthDialog() {
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const [code, setCode] = useState({ value: '', complete: false })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    setReauthHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve
          setError(null)
          setCode({ value: '', complete: false })
          setOpen(true)
          apiRequest<{ destination: string }>('/auth/reconfirmation', { method: 'POST' })
            .then((res) => setDestination(res.destination))
            .catch((err) => {
              // Un code déjà envoyé il y a moins de 45 s reste valable.
              if (!(err instanceof ApiRequestError && err.code === 'RESEND_TOO_SOON')) {
                setError(err instanceof ApiRequestError ? err.message : "Impossible d'envoyer le code.")
              }
            })
        }),
    )
    return () => setReauthHandler(null)
  }, [])

  const close = (ok: boolean) => {
    setOpen(false)
    resolver.current?.(ok)
    resolver.current = null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.complete || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // Un code faux répond 401 : ce n'est pas une session expirée, ne pas déconnecter.
      await apiRequest('/auth/reconfirmation/verifier', { method: 'POST', body: { code: code.value }, notifyUnauthorized: false })
      close(true)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Code invalide.')
      // Trop de codes faux : le serveur a fermé la session ; la prochaine requête renverra à la connexion.
      if (err instanceof ApiRequestError && err.code === 'SESSION_REVOKED') close(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
      <form onSubmit={submit} className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Icon name="lock_clock" className="text-primary" />
          <h2 id="reauth-title" className="font-headline-sm text-headline-sm text-on-surface">
            Confirmez cette action
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Cette action est sensible. Saisissez le code envoyé par email{destination ? ` à ${destination}` : ''}. Il reste valable 5 minutes pour
          vos actions suivantes.
        </p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <OtpInputGroup length={6} onChange={(value, complete) => setCode({ value, complete })} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => close(false)}
            className="flex-1 py-2 rounded-lg border border-outline-variant font-label-md text-label-md text-on-surface"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!code.complete || submitting}
            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
          >
            {submitting ? 'Vérification…' : 'Confirmer'}
          </button>
        </div>
      </form>
    </div>
  )
}
