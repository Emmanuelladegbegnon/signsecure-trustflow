import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

interface InvitationInfo {
  nom: string
  prenom: string
  email: string
}

// Règle complète vérifiée par le serveur (mots de passe courants, nom ou email refusés).
const MIN_PASSWORD_LENGTH = 12

/**
 * GET /api/auth/invitation/:token puis POST .../activer — un compte est
 * toujours créé par un administrateur (jamais d'auto-inscription), cet écran
 * ne fait qu'activer le mot de passe du compte déjà provisionné.
 */
export function AccountActivation() {
  const { token } = useParams<{ token: string }>()

  const [stage, setStage] = useState<'loading' | 'invalid' | 'ready' | 'done'>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStage('invalid')
      return
    }
    const controller = new AbortController()
    apiRequest<InvitationInfo>(`/auth/invitation/${token}`, { auth: false, signal: controller.signal })
      .then((data) => {
        setInvitation(data)
        setStage('ready')
      })
      .catch(() => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas une vraie invitation invalide.
        if (controller.signal.aborted) return
        setStage('invalid')
      })
    return () => controller.abort()
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setApiError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      return
    }
    if (password !== confirm) {
      setFieldError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      await apiRequest(`/auth/invitation/${token}/activer`, { method: 'POST', body: { password }, auth: false })
      setStage('done')
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (stage === 'loading') {
    return <FullscreenSpinner />
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop antialiased">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Icon name="verified" filled size={32} />
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight">SignSecure TrustFlow</span>
        </div>
      </div>

      <main className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] p-8 border border-surface-variant flex flex-col items-center">
          {stage === 'invalid' && (
            <>
              <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mb-6">
                <Icon name="link_off" className="text-on-error-container" size={28} />
              </div>
              <h1 className="font-headline-md text-headline-md text-on-surface mb-2 text-center">Invitation invalide</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center mb-6">
                Ce lien d'invitation n'est pas reconnu, a déjà été utilisé, ou a expiré. Demandez à votre administrateur de vous
                envoyer une nouvelle invitation.
              </p>
              <Link to={ROUTES.login} className="font-label-sm text-label-sm text-primary hover:underline">
                Retour à la connexion
              </Link>
            </>
          )}

          {stage === 'done' && (
            <>
              <div className="w-16 h-16 bg-[#e8f5e9] rounded-full flex items-center justify-center mb-6">
                <Icon name="check_circle" filled size={28} className="text-[#2e7d32]" />
              </div>
              <h1 className="font-headline-md text-headline-md text-on-surface mb-2 text-center">Compte activé</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center mb-6">
                Votre mot de passe est défini. Vous pouvez maintenant vous connecter.
              </p>
              <Link
                to={ROUTES.login}
                className="w-full text-center bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Se connecter
              </Link>
            </>
          )}

          {stage === 'ready' && invitation && (
            <>
              <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center text-primary mb-6">
                <Icon name="person_add" size={28} />
              </div>
              <div className="text-center mb-6">
                <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Activer votre compte</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Bienvenue {invitation.prenom} {invitation.nom} — définissez votre mot de passe pour {invitation.email}.
                </p>
              </div>

              {(fieldError || apiError) && (
                <div className="w-full mb-6">
                  <FormAlert tone="error">{fieldError ?? apiError}</FormAlert>
                </div>
              )}

              <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="new-password">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      className="block w-full pr-10 px-3 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all"
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      <Icon name={showPassword ? 'visibility' : 'visibility_off'} />
                    </button>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Au moins {MIN_PASSWORD_LENGTH} caractères. Une courte phrase facile à retenir fonctionne bien ; évitez votre nom et les
                    mots de passe courants.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="confirm-password">
                    Confirmer le mot de passe
                  </label>
                  <input
                    className="block w-full px-3 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all"
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  className="mt-2 w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg font-label-md text-label-md text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
                  {submitting ? 'Activation…' : 'Activer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
