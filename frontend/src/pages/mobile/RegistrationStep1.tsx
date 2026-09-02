import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { TRACE_DOCUMENT_TYPES } from '../../constants/traceTypes'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { traceCaptureUrl } from '../../routes'

const STEPS = [
  { label: 'Informations', active: true },
  { label: 'Métadonnées', active: false },
  { label: 'Validation', active: false },
]

const CONFIDENTIALITE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'confidentiel', label: 'Confidentiel' },
]

interface RegisterResponse {
  dossierId: string
}

export function RegistrationStep1() {
  const navigate = useNavigate()

  const [confirmed, setConfirmed] = useState(false)
  const [type, setType] = useState('')
  const [titre, setTitre] = useState('')
  const [reference, setReference] = useState('')
  const [organismeDeclare, setOrganismeDeclare] = useState('')
  const [dateIndiquee, setDateIndiquee] = useState('')
  const [nombrePages, setNombrePages] = useState('')
  const [confidentialite, setConfidentialite] = useState('standard')
  const [lieuReception, setLieuReception] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!confirmed) errors.confirmed = 'Confirmez que ce document a été signé hors SignSecure.'
    if (!type) errors.type = 'Sélectionnez un type de document.'
    if (!titre.trim()) errors.titre = 'Le titre du document est requis.'
    if (!dateIndiquee) errors.dateIndiquee = 'La date indiquée sur le document est requise.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const { dossierId } = await apiRequest<RegisterResponse>('/trace/enregistrement', {
        method: 'POST',
        body: {
          type,
          titre: titre.trim(),
          reference: reference.trim() || undefined,
          organismeDeclare: organismeDeclare.trim() || undefined,
          dateIndiquee,
          nombrePages: nombrePages ? Number(nombrePages) : undefined,
          confidentialite,
          lieuReception: lieuReception.trim() || undefined,
        },
      })
      navigate(traceCaptureUrl(dossierId))
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      <header className="bg-surface-container-lowest shadow-sm flex items-center h-16 px-margin-mobile z-40 sticky top-0">
        <button
          className="mr-4 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low"
          onClick={() => navigate(-1)}
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex-1">Enregistrement Physique</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-margin-mobile py-6 pb-24 max-w-container-max mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-variant -z-10 rounded-full" />
            {STEPS.map((step) => (
              <div key={step.label} className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${
                    step.active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  {STEPS.indexOf(step) + 1}
                </div>
                <span className={`font-label-sm text-label-sm ${step.active ? 'text-primary' : 'text-on-surface-variant'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          Veuillez renseigner les informations relatives au document physique pour l'intégrer à la chaîne de confiance.
        </p>

        {apiError && (
          <div className="mb-6">
            <FormAlert tone="error">{apiError}</FormAlert>
          </div>
        )}

        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-pointer group">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="flex items-center h-6">
                <input
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-lowest cursor-pointer"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface">Je confirme que ce document a été signé hors SignSecure</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Cochez cette case si le document original est au format papier ou a été signé électroniquement via un tiers.
                </span>
              </div>
            </label>
          </div>
          {fieldErrors.confirmed && (
            <p className="font-label-sm text-label-sm text-error flex items-center gap-1 -mt-4">
              <Icon name="error" size={14} />
              {fieldErrors.confirmed}
            </p>
          )}

          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-type">
                Type de document *
              </label>
              <div className="relative">
                <select
                  className={`w-full h-12 bg-surface-container-lowest border rounded-lg px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow ${
                    fieldErrors.type ? 'border-error' : 'border-outline-variant'
                  }`}
                  id="doc-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">Sélectionner un type</option>
                  {TRACE_DOCUMENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Icon name="expand_more" className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-title">
                Titre du document *
              </label>
              <input
                className={`w-full h-12 bg-surface-container-lowest border rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow placeholder-on-surface-variant/50 ${
                  fieldErrors.titre ? 'border-error' : 'border-outline-variant'
                }`}
                id="doc-title"
                placeholder="Ex: Contrat de prestation de services SA"
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-ref">
                Référence interne
              </label>
              <input
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow placeholder-on-surface-variant/50"
                id="doc-ref"
                placeholder="Ex: REF-2023-10-A"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-organisme">
                Organisme déclarant
              </label>
              <input
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow placeholder-on-surface-variant/50"
                id="doc-organisme"
                placeholder="Ex: Banque Atlantique"
                type="text"
                value={organismeDeclare}
                onChange={(e) => setOrganismeDeclare(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-date">
                  Date indiquée sur le document *
                </label>
                <input
                  className={`w-full h-12 bg-surface-container-lowest border rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow ${
                    fieldErrors.dateIndiquee ? 'border-error' : 'border-outline-variant'
                  }`}
                  id="doc-date"
                  type="date"
                  value={dateIndiquee}
                  onChange={(e) => setDateIndiquee(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-pages">
                  Nombre de pages
                </label>
                <input
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow"
                  id="doc-pages"
                  type="number"
                  min={1}
                  value={nombrePages}
                  onChange={(e) => setNombrePages(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-confidentialite">
                  Confidentialité
                </label>
                <select
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow"
                  id="doc-confidentialite"
                  value={confidentialite}
                  onChange={(e) => setConfidentialite(e.target.value)}
                >
                  {CONFIDENTIALITE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="doc-location">
                  Lieu de réception
                </label>
                <div className="relative">
                  <input
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-on-surface transition-shadow placeholder-on-surface-variant/50"
                    id="doc-location"
                    placeholder="Ex: Siège Abidjan"
                    type="text"
                    value={lieuReception}
                    onChange={(e) => setLieuReception(e.target.value)}
                  />
                  <Icon name="location_on" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 flex justify-end z-50">
            <button
              className="w-full md:w-auto h-12 bg-primary text-on-primary font-label-md text-label-md px-8 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm active:scale-95 duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {submitting ? 'Enregistrement…' : 'Suivant'}
              {!submitting && <Icon name="arrow_forward" size={20} />}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
