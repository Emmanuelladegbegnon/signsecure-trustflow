import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!email.trim()) errors.email = 'Adresse e-mail requise.'
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Adresse e-mail invalide.'
    if (!password) errors.password = 'Mot de passe requis.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const { otpChannel } = await login(email.trim(), password)
      navigate(ROUTES.otpLogin, { state: { email: email.trim(), otpChannel } })
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background text-on-background antialiased min-h-screen w-full flex">
      <div className="w-full lg:w-1/2 bg-surface-container-lowest min-h-screen flex flex-col justify-center px-margin-mobile sm:px-12 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2 mb-12">
            <Icon name="security" filled className="text-primary-container text-4xl" />
            <span className="font-display text-display text-primary-container">SignSecure</span>
          </div>
          <div className="mb-8">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Se connecter</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Accédez à votre espace sécurisé TrustFlow.</p>
          </div>

          {apiError && (
            <div className="mb-6">
              <FormAlert tone="error">{apiError}</FormAlert>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="mail" className="text-outline" />
                </div>
                <input
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all ${
                    fieldErrors.email ? 'border-error' : 'border-outline-variant'
                  }`}
                  id="email"
                  name="email"
                  placeholder="nom@entreprise.com"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="font-label-sm text-label-sm text-error flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                  Mot de passe
                </label>
                <Link className="font-label-sm text-label-sm text-primary-container hover:text-primary transition-colors" to="#">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="lock" className="text-outline" />
                </div>
                <input
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all ${
                    fieldErrors.password ? 'border-error' : 'border-outline-variant'
                  }`}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-outline hover:text-on-surface transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Icon name={showPassword ? 'visibility' : 'visibility_off'} />
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="font-label-sm text-label-sm text-error flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-variant flex justify-center items-center text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="verified_user" size={16} className="mr-1" />
            Connexion chiffrée de bout en bout
          </div>
        </div>
      </div>
      <div className="hidden lg:flex w-1/2 min-h-screen bg-primary-container relative overflow-hidden flex-col items-center justify-center">
        <div className="absolute inset-0 pattern-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container/80 to-primary/95" />
        <div className="relative z-10 p-16 max-w-lg text-center text-on-primary">
          <Icon name="assured_workload" filled className="text-6xl mb-6 text-primary-fixed block" />
          <h2 className="font-display text-display mb-4">Confiance institutionnelle</h2>
          <p className="font-body-lg text-body-lg text-primary-fixed-dim">
            La plateforme de référence pour la gestion et la signature de documents juridiques sensibles. Sécurisé.
            Conforme. Traçable.
          </p>
        </div>
      </div>
    </div>
  )
}
