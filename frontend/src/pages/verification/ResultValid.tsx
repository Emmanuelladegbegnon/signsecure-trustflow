import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'

export function ResultValid() {
  return (
    <AppShell active="verify">
      <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-4 flex items-center gap-4 mb-8 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-[#4caf50] text-white flex items-center justify-center shrink-0">
          <Icon name="check" size={24} />
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-[#2e7d32]">Document enregistré - statut valide</h2>
          <p className="font-body-sm text-body-sm text-[#1b5e20] opacity-80">La vérification cryptographique a été effectuée avec succès le 24 Oct 2023 à 14:32:01 UTC.</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Résultats d'Analyse</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Détails de la validation du document de transaction financière.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="folder_open" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Identité du dossier</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">RÉFÉRENCE</span>
              <span className="font-body-md text-body-md font-medium">TRX-2023-8902A</span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">TYPE DE DOCUMENT</span>
              <span className="font-body-md text-body-md font-medium">Contrat B2B Standard</span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">PROPRIÉTAIRE</span>
              <span className="font-body-md text-body-md font-medium">Awa KONE</span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">TAILLE</span>
              <span className="font-body-md text-body-md font-medium">2.4 MB (PDF)</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="trip_origin" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Origine</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center mb-4">
              <Icon name="security" size={32} className="text-primary" />
            </div>
            <span className="font-label-md text-label-md font-bold text-primary mb-2">Signé dans SignSecure</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">L'origine du document est certifiée par notre infrastructure sécurisée.</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="data_check" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Intégrité</h3>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Hash Correspondant</span>
              <span className="px-2 py-1 bg-[#e8f5e9] text-[#2e7d32] rounded-md font-label-sm text-label-sm">100% Match</span>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-outline-variant/50 break-all font-mono text-[11px] text-on-surface-variant">
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="draw" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Signature</h3>
          </div>
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">JD</div>
              <div>
                <span className="font-label-md text-label-md font-semibold block">Jean Dupont</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block">Directeur Financier</span>
                <span className="font-label-sm text-label-sm text-primary mt-1 block">Certificat X.509 Valide</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="history" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Traçabilité</h3>
          </div>
          <div className="flex-1 relative pl-4 border-l-2 border-outline-variant/30 space-y-4">
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white" />
              <span className="font-label-sm text-label-sm text-on-surface-variant block">Aujourd'hui, 14:32</span>
              <span className="font-body-sm text-body-sm font-medium">Vérification complétée</span>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-outline-variant ring-4 ring-white" />
              <span className="font-label-sm text-label-sm text-on-surface-variant block">23 Oct 2023, 09:15</span>
              <span className="font-body-sm text-body-sm font-medium">Document signé</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant pt-6 text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant/70 max-w-2xl mx-auto">
          Ce rapport de vérification est généré automatiquement par SignSecure TrustFlow. Il atteste de l'intégrité cryptographique du document au moment de l'analyse. Ce document ne constitue pas un avis juridique indépendant.
        </p>
      </div>
    </AppShell>
  )
}
