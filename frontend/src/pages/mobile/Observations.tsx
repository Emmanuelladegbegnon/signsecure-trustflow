import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { Stepper } from '../../components/ui/Stepper'
import { TRACE_REGISTRATION_STEPS } from '../../constants/steps'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'
import { CodeLabel } from './CodeLabel'
import { RegistrationConfirmation } from './RegistrationConfirmation'

const CHECKS = [
  { key: 'signaturePresente', label: 'Signature présente', hint: 'Vérifier toutes les pages requises', default: true },
  { key: 'pagesCompletes', label: 'Pages complètes', hint: 'Aucune page manquante ou altérée', default: true },
  { key: 'cachetVisible', label: 'Cachet visible', hint: 'Lisible et officiel', default: false },
  { key: 'documentLisible', label: 'Document lisible', hint: 'Texte net, sans altération', default: true },
  { key: 'enveloppeIntacte', label: 'Enveloppe intacte', hint: 'Scellés originaux non brisés', default: true },
] as const

type Step = { kind: 'form' } | { kind: 'pending' } | { kind: 'label'; trackingCode: string; etiquetteUrl: string } | { kind: 'done'; trackingCode: string }

interface ValidateResponse {
  success: true
  trackingCode: string
  etiquetteUrl: string
}

export function Observations() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canValidate = user?.roles.includes('Superviseur') ?? false

  const [checks, setChecks] = useState<Record<string, boolean>>(() => Object.fromEntries(CHECKS.map((c) => [c.key, c.default])))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<Step>({ kind: 'form' })

  const toggle = (key: string) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleSubmit = async () => {
    if (!id || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest(`/trace/${id}/observations`, {
        method: 'POST',
        body: { ...checks, anomalie: note.trim() || undefined },
      })

      if (canValidate) {
        const validated = await apiRequest<ValidateResponse>(`/trace/${id}/valider`, { method: 'POST' })
        setStep({ kind: 'label', trackingCode: validated.trackingCode, etiquetteUrl: validated.etiquetteUrl })
      } else {
        setStep({ kind: 'pending' })
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step.kind === 'label') {
    return (
      <CodeLabel
        trackingCode={step.trackingCode}
        etiquetteUrl={step.etiquetteUrl}
        onFinish={() => setStep({ kind: 'done', trackingCode: step.trackingCode })}
      />
    )
  }

  if (step.kind === 'done') {
    return <RegistrationConfirmation trackingCode={step.trackingCode} onDone={() => navigate(ROUTES.traceabilityList)} />
  }

  if (step.kind === 'pending') {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-margin-mobile">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-4">
            <Icon name="hourglass_top" className="text-on-secondary-container" size={28} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Dossier soumis</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Les observations ont été enregistrées. Un superviseur doit valider ce dossier avant que le code de suivi et l'étiquette ne soient
            générés.
          </p>
          <button
            className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => navigate(ROUTES.traceabilityList)}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background antialiased font-body-md flex flex-col min-h-screen">
      <header className="bg-surface-container-lowest shadow-sm w-full h-16 px-gutter flex justify-between items-center z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <button aria-label="Retour" className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full" onClick={() => navigate(-1)}>
            <Icon name="arrow_back" />
          </button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary">Observations</h1>
        </div>
      </header>

      <main className="flex-grow p-margin-mobile flex flex-col gap-6 max-w-lg mx-auto w-full pb-24">
        <Stepper steps={TRACE_REGISTRATION_STEPS} currentStep={2} />

        <div className="mb-2">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Vérification du Document</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Veuillez confirmer les points de contrôle suivants pour le document en cours de traitement.</p>
        </div>

        {error && <FormAlert tone="error">{error}</FormAlert>}

        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          {CHECKS.map((check, i) => (
            <label
              key={check.key}
              htmlFor={`toggle-${check.key}`}
              className={`p-4 flex justify-between items-center hover:bg-surface-container-highest transition-colors cursor-pointer ${
                i < CHECKS.length - 1 ? 'border-b border-outline-variant/20' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">{check.label}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{check.hint}</span>
              </div>
              <button
                type="button"
                id={`toggle-${check.key}`}
                role="switch"
                aria-checked={checks[check.key]}
                onClick={() => toggle(check.key)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${checks[check.key] ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    checks[check.key] ? 'translate-x-[26px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </section>

        <section className="mt-2">
          <label className="block font-label-md text-label-md text-on-surface mb-2 font-semibold" htmlFor="anomalie">
            Anomalie constatée
          </label>
          <textarea
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none shadow-sm placeholder:text-on-surface-variant/60"
            id="anomalie"
            placeholder="Décrivez brièvement toute anomalie observée (facultatif)..."
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <Icon name="info" size={16} />
            Laissez vide si tout est conforme.
          </p>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/20 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-lg mx-auto flex gap-4">
          <button className="flex-1 py-3 px-4 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container-low transition-colors text-center" onClick={() => navigate(-1)}>
            Précédent
          </button>
          <button
            className="flex-1 py-3 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm text-center flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
          >
            {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
            {submitting ? 'Envoi…' : 'Suivant'}
            {!submitting && <Icon name="arrow_forward" size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
