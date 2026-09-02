import { useNavigate } from 'react-router-dom'
import { PublicShell } from '../../components/layout/PublicShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function SignatureSuccess() {
  const navigate = useNavigate()

  return (
    <PublicShell>
      {/* Transactional success screen — no navigation shell by design */}
      <main className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1)] p-8 md:p-12 flex flex-col items-center text-center animate-scale-in">
        <div className="mb-8">
          <h1 className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</h1>
        </div>
        <div className="w-24 h-24 bg-[#E6F4EA] rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Icon name="check_circle" filled size={48} className="text-[#137333]" />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Document signé avec succès</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-sm">
          La signature électronique a été appliquée et horodatée sur la blockchain. Le document est maintenant sécurisé et juridiquement contraignant.
        </p>

        <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-6 mb-8 text-left">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-label-md text-label-md text-on-surface mb-1">Code de suivi</h3>
              <p className="font-body-lg text-body-lg font-mono text-primary tracking-wider">SS-7K4M-29QX</p>
            </div>
            <div className="w-16 h-16 bg-white border border-outline-variant rounded flex items-center justify-center text-on-surface-variant">
              <Icon name="qr_code_2" size={40} />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/50">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Icon name="description" size={16} />
              <span className="font-body-sm text-body-sm">Contrat_Partenariat_2023.pdf</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Icon name="schedule" size={16} />
              <span className="font-body-sm text-body-sm">12 Oct 2023, 14:35 UTC</span>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-4">
          <button className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-lg hover:bg-primary-fixed-variant transition-colors shadow-sm">
            <Icon name="download" size={20} />
            Télécharger le PDF signé
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-outline text-on-surface font-label-md text-label-md py-3 px-6 rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={() => navigate(ROUTES.proofReport)}
          >
            <Icon name="verified_user" size={20} />
            Voir le rapport de preuve
          </button>
          <button
            className="mt-4 font-label-sm text-label-sm text-primary hover:underline text-center"
            onClick={() => navigate(ROUTES.dashboard)}
          >
            Retour au tableau de bord
          </button>
        </div>
      </main>
    </PublicShell>
  )
}
