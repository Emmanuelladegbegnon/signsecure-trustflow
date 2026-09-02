import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function UnknownCode() {
  const navigate = useNavigate()

  return (
    <AppShell active="verify">
      <div className="max-w-md w-full mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 md:p-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-surface-container flex items-center justify-center">
          <Icon name="search" size={48} className="text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }} />
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Aucun dossier ne correspond à ce code</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          Nous n'avons pas pu trouver de document associé au code saisi. Veuillez vérifier les caractères et réessayer.
        </p>
        <button
          className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3 px-8 rounded-lg shadow-sm transition-colors w-full md:w-auto"
          onClick={() => navigate(ROUTES.verifyPublic)}
        >
          Réessayer
        </button>
        <div className="mt-8 pt-6 border-t border-outline-variant w-full">
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
            Besoin d'aide ? <a className="text-primary hover:underline" href="#">Contacter le support</a>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
