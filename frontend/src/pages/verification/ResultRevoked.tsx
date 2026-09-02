import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function ResultRevoked() {
  const navigate = useNavigate()

  return (
    <AppShell active="verify">
      <div className="flex flex-col gap-2 mb-8">
        <button className="flex items-center gap-2 text-primary font-label-md text-label-md w-fit hover:underline" onClick={() => navigate(ROUTES.verifyPublic)}>
          <Icon name="arrow_back" />
          Retour au scan
        </button>
        <h1 className="font-display text-display text-on-background">Résultat d'Analyse</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Rapport de vérification cryptographique du document soumis.</p>
      </div>

      <div className="bg-error-container rounded-xl p-6 border-l-4 border-error shadow-sm flex items-start gap-4 mb-8">
        <Icon name="warning" filled className="text-error text-3xl" />
        <div className="flex-1">
          <h2 className="font-headline-md text-headline-md text-on-error-container mb-2">Document Révoqué</h2>
          <p className="font-body-md text-body-md text-on-error-container/80 mb-4">
            La signature cryptographique de ce document a été explicitement révoquée par l'autorité émettrice. Ce document ne doit plus être considéré comme valide ou authentique pour toute transaction légale ou financière.
          </p>
          <div className="bg-surface-container-lowest/50 rounded-lg p-4 font-body-sm text-body-sm text-on-error-container flex flex-col gap-1">
            <div className="flex justify-between border-b border-error/20 pb-2">
              <span className="font-semibold">Motif de révocation:</span>
              <span>Compromission présumée de la clé privée</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-semibold">Date de révocation:</span>
              <span>14 Nov 2023, 09:42 UTC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 grayscale-[50%]">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4">
          <div className="flex items-center gap-3 text-secondary">
            <Icon name="description" />
            <h3 className="font-headline-sm text-headline-sm">Informations Document</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Nom du fichier</div>
              <div className="font-body-md text-body-md text-on-surface font-medium break-all">Contrat_Partenariat_Final_v2.pdf</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Empreinte SHA-256</div>
              <div className="font-body-sm text-body-sm text-on-surface font-mono bg-surface p-2 rounded break-all border border-outline-variant/50">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="cancel" size={16} /> Invalide
          </div>
          <div className="flex items-center gap-3 text-secondary">
            <Icon name="person_cancel" />
            <h3 className="font-headline-sm text-headline-sm">Identité Signataire</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                <Icon name="domain" />
              </div>
              <div>
                <div className="font-body-md text-body-md font-semibold text-on-surface">Ministère des Finances</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">ID: GOUV-CI-00129</div>
              </div>
            </div>
            <div className="mt-2 border-t border-outline-variant pt-3">
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Certificat (Révoqué)</div>
              <div className="font-body-sm text-body-sm text-on-surface text-error">N° 8839-4421-BBAA (Expiré/Révoqué)</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4 relative lg:col-span-1 md:col-span-2">
          <div className="absolute top-4 right-4 bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="gpp_bad" size={16} /> Compromis
          </div>
          <div className="flex items-center gap-3 text-secondary">
            <Icon name="security_update_warning" />
            <h3 className="font-headline-sm text-headline-sm">Intégrité &amp; Timestamp</h3>
          </div>
          <div className="flex-1 flex flex-col gap-4 mt-4">
            <div className="flex items-start gap-3">
              <Icon name="history" className="text-secondary mt-0.5" />
              <div>
                <div className="font-label-md text-label-md font-semibold text-on-surface">Horodatage Initial</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">12 Oct 2023, 14:30 UTC</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="block" className="text-error mt-0.5" />
              <div>
                <div className="font-label-md text-label-md font-semibold text-error">Statut de la Chaîne</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">Rupture de confiance détectée au niveau du nœud d'autorité.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
