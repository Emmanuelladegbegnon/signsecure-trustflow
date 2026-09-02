import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'

export function ReportIncident() {
  const navigate = useNavigate()

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased">
      <header className="flex justify-between items-center w-full h-16 px-margin-mobile bg-surface shadow-sm z-40 sticky top-0">
        <button aria-label="Retour" className="text-on-surface-variant p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface flex-1 text-center truncate px-4">Déclarer un incident</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile flex flex-col gap-9 pb-24">
        <section className="bg-error-container rounded-xl p-4 shadow-sm flex gap-3 items-start border border-error/20">
          <Icon name="warning" className="text-error mt-0.5" />
          <div>
            <h2 className="font-label-md text-label-md text-on-error-container mb-1">Attention requise</h2>
            <p className="font-body-sm text-body-sm text-on-error-container/80">
              Veuillez fournir des détails précis concernant l'incident. Ces informations sont cruciales pour nos équipes de conformité et de sécurité.
            </p>
          </div>
        </section>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(-1)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="incident_type">
              Type d'incident
            </label>
            <div className="relative">
              <select
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm transition-all"
                id="incident_type"
                name="incident_type"
                defaultValue=""
              >
                <option disabled value="">
                  Sélectionnez un type
                </option>
                <option value="falsification">Falsification de document</option>
                <option value="usurpation">Usurpation d'identité</option>
                <option value="perte">Perte de données</option>
                <option value="technique">Problème technique (Signature)</option>
                <option value="autre">Autre</option>
              </select>
              <Icon name="expand_more" className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="incident_description">
              Description détaillée
            </label>
            <textarea
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm transition-all placeholder:text-on-surface-variant/50 resize-y"
              id="incident_description"
              name="incident_description"
              placeholder="Décrivez les circonstances, l'heure, et les parties impliquées..."
              rows={5}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pièce(s) jointe(s) (Optionnel)</span>
            <button
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-outline-variant rounded-lg text-primary bg-surface-container-lowest hover:bg-surface-container-low transition-colors group"
              type="button"
            >
              <Icon name="add_a_photo" className="text-primary group-hover:scale-110 transition-transform" />
              <span className="font-label-md text-label-md">Ajouter une photo ou un document</span>
            </button>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Formats acceptés: JPG, PNG, PDF. Max 5MB.</p>
          </div>

          <div className="fixed bottom-0 left-0 w-full p-margin-mobile bg-surface shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-outline-variant z-50">
            <button
              className="w-full bg-error text-on-error font-label-md text-label-md py-3.5 px-6 rounded-lg shadow-sm hover:bg-error/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              type="submit"
            >
              <Icon name="report" filled />
              Déclarer l'incident
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
