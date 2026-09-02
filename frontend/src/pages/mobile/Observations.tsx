import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

const CHECKS = [
  { key: 'signature', label: 'Signature présente', hint: 'Vérifier toutes les pages requises', default: true },
  { key: 'pages', label: 'Pages complètes', hint: 'Aucune page manquante ou altérée', default: true },
  { key: 'stamp', label: 'Cachet visible', hint: 'Lisible et officiel', default: false },
  { key: 'envelope', label: 'Enveloppe intacte', hint: 'Scellés originaux non brisés', default: true },
] as const

export function Observations() {
  const navigate = useNavigate()
  const [checks, setChecks] = useState<Record<string, boolean>>(() => Object.fromEntries(CHECKS.map((c) => [c.key, c.default])))
  const [note, setNote] = useState('')

  const toggle = (key: string) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="bg-background text-on-background antialiased font-body-md flex flex-col min-h-screen">
      <header className="bg-surface-container-lowest shadow-sm w-full h-16 px-gutter flex justify-between items-center z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <button aria-label="Retour" className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full" onClick={() => navigate(-1)}>
            <Icon name="arrow_back" />
          </button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary">Observations</h1>
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant">Étape 3/4</div>
      </header>

      <main className="flex-grow p-margin-mobile flex flex-col gap-6 max-w-lg mx-auto w-full pb-24">
        <div className="mb-2">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Vérification du Document</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Veuillez confirmer les points de contrôle suivants pour le document en cours de traitement.</p>
        </div>

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
            className="flex-1 py-3 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm text-center flex items-center justify-center gap-2"
            onClick={() => navigate(ROUTES.mobileRegistrationConfirm)}
          >
            Suivant
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
