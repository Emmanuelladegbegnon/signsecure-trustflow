import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function TransferRequest() {
  const navigate = useNavigate()

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      <header className="bg-surface-container-lowest shadow-[0px_1px_3px_rgba(15,23,42,0.1)] flex items-center h-16 px-margin-mobile sticky top-0 z-40">
        <button
          aria-label="Retour"
          className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          onClick={() => navigate(-1)}
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="ml-2 font-headline-sm text-headline-sm text-on-surface">Demande de transfert</h1>
      </header>

      <main className="flex-1 flex flex-col px-margin-mobile py-gutter w-full max-w-[600px] mx-auto gap-9">
        <section>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex items-start gap-4">
            <div className="bg-surface-container-high p-3 rounded-lg text-primary shrink-0">
              <Icon name="folder" filled size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-label-md text-label-md text-on-surface truncate mb-1">Contrat_Cadre_Services_Financiers_V2.pdf</h3>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Icon name="shield" size={16} />
                <p className="font-body-sm text-body-sm truncate">ID: DOC-2023-8902A</p>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-surface-container-high px-2 py-1 rounded-md">
                <Icon name="history" size={14} className="text-primary" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Modifié le 12 Oct 2023</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">Détails du transfert</h2>
          <form
            className="flex flex-col gap-6 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(ROUTES.traceabilityList)
            }}
          >
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="destination">
                Destination (Agence ou Service)
              </label>
              <div className="relative">
                <Icon name="domain" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <select
                  className="block w-full pl-10 pr-10 py-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg appearance-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                  id="destination"
                  name="destination"
                  defaultValue=""
                >
                  <option disabled value="">
                    Sélectionner une destination
                  </option>
                  <option value="dakar-hq">Siège - Dakar Plateau</option>
                  <option value="abidjan-branch">Succursale - Abidjan Cocody</option>
                  <option value="legal-dept">Département Juridique Central</option>
                  <option value="compliance-dept">Service Conformité et Audit</option>
                </select>
                <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="lieu">
                Lieu physique cible
              </label>
              <div className="relative">
                <Icon name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  className="block w-full pl-10 pr-3 py-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-shadow placeholder:text-on-surface-variant/60"
                  id="lieu"
                  name="lieu"
                  placeholder="Ex: Bureau 402, Bâtiment A"
                  type="text"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="motif">
                Motif du transfert
              </label>
              <textarea
                className="block w-full p-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-shadow resize-none placeholder:text-on-surface-variant/60"
                id="motif"
                name="motif"
                placeholder="Veuillez préciser la raison légale ou opérationnelle de ce transfert..."
                rows={4}
              />
            </div>

            <div className="mt-auto pt-8 pb-4">
              <button
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
                type="submit"
              >
                <Icon name="send" size={20} />
                Envoyer la demande
              </button>
              <button className="w-full mt-4 text-primary font-label-md text-label-md py-3 rounded-full hover:bg-surface-container-high transition-colors" type="button" onClick={() => navigate(-1)}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
