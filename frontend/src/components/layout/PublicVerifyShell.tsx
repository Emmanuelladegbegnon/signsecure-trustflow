import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Icon } from '../ui/Icon'
import { ROUTES } from '../../routes'
import { OFFICIAL_VERIFY_HOST } from '../../constants/officialDomain'

/**
 * Chrome pour les pages du module Verify (résultat, comparaison de fichier).
 * Volontairement sans sidebar : /api/verify/* est public dans
 * API_CONTRACT.md, ces écrans sont accessibles par un lien partagé sans
 * jamais laisser croire à une session interne active. Si un utilisateur
 * interne connecté arrive ici (ex. depuis le tableau de bord), on lui garde
 * un chemin de retour plutôt que de le laisser sans repère.
 *
 * Le bandeau rappelle l'adresse officielle : parade au QR piégé qui mènerait
 * vers un faux site de vérification affichant « signé ».
 */
export function PublicVerifyShell({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <header className="flex items-center justify-between h-16 px-margin-mobile md:px-margin-desktop bg-white shadow-sm sticky top-0 z-40">
        <Link to={ROUTES.verifyPublic} className="flex items-center gap-2">
          <Icon name="verified_user" className="text-primary" />
          <span className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</span>
        </Link>
        <div className="flex items-center gap-4">
          {status === 'authenticated' && (
            <Link to={ROUTES.dashboard} className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary hover:underline">
              Tableau de bord
            </Link>
          )}
          <Link to={ROUTES.verifyPublic} className="font-label-sm text-label-sm text-primary hover:underline">
            Nouvelle vérification
          </Link>
        </div>
      </header>
      <div className="bg-secondary-container/50 border-b border-outline-variant/40 px-margin-mobile md:px-margin-desktop py-2">
        <p className="max-w-container-max mx-auto font-label-sm text-label-sm text-on-surface flex items-start gap-2">
          <Icon name="shield" size={16} className="shrink-0 mt-0.5" />
          <span>
            Adresse officielle de vérification : <strong>{OFFICIAL_VERIFY_HOST}</strong>. Si la barre d'adresse de votre navigateur affiche un autre
            domaine, ce site n'est pas SignSecure : ne vous fiez pas au résultat affiché.
          </span>
        </p>
      </div>
      <main className="max-w-container-max mx-auto p-margin-mobile md:p-margin-desktop">{children}</main>
      <footer className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-8 font-label-sm text-label-sm text-on-surface-variant flex flex-wrap gap-4">
        <span>Prototype de démonstration — SignSecure n'est pas un prestataire de services de confiance qualifié.</span>
        <Link to={ROUTES.personalData} className="text-primary hover:underline">
          Données personnelles
        </Link>
      </footer>
    </div>
  )
}
