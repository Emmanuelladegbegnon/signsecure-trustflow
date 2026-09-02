import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

const STEPS = ['Upload', 'Détails', 'Signataires']

export function NewDocument() {
  const navigate = useNavigate()

  return (
    <AppShell active="sign">
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Nouveau Document</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Préparez un document pour signature électronique sécurisée.</p>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-variant -z-10" />
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm shadow-sm ring-4 ring-background ${
                  i === 0 ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                }`}
              >
                {i + 1}
              </div>
              <span className={`font-label-sm text-label-sm ${i === 0 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 md:p-8 max-w-3xl mx-auto">
        <div className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-surface-container-low transition-colors cursor-pointer mb-8 group bg-surface">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
            <Icon name="upload_file" filled className="text-3xl text-on-surface-variant group-hover:text-on-primary-container" />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Glissez-déposez votre PDF ici</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">ou cliquez pour parcourir vos fichiers (Max 10MB)</p>
          <button type="button" className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label-md text-label-md hover:bg-secondary-fixed transition-colors shadow-sm">
            Sélectionner un fichier
          </button>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(ROUTES.assignSigners)
          }}
        >
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="titre-dossier">
              Titre du dossier
            </label>
            <input
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow font-body-md text-body-md placeholder:text-on-surface-variant/50"
              id="titre-dossier"
              name="titre-dossier"
              placeholder="Ex: Contrat de prestation - Client X"
              type="text"
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="type-document">
              Type de document
            </label>
            <div className="relative">
              <select
                className="appearance-none w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow font-body-md text-body-md pr-10"
                id="type-document"
                name="type-document"
                defaultValue=""
              >
                <option disabled value="">
                  Sélectionnez un type
                </option>
                <option value="contrat">Contrat</option>
                <option value="bon_commande">Bon de commande</option>
                <option value="nda">Accord de confidentialité (NDA)</option>
                <option value="autre">Autre</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                <Icon name="expand_more" />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-outline-variant flex justify-end">
            <button
              className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              type="submit"
            >
              Suivant
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
