import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'

const TIMELINE = [
  { title: 'Réception confirmée', current: true, actor: 'Kouamé Diallo (Directeur Général)', actorIcon: 'person', time: '15 Oct 2023, 14:30 GMT', icon: 'check_circle' },
  { title: 'Transfert demandé', current: false, actor: 'Awa KONE (Superviseur)', actorIcon: 'person', time: '14 Oct 2023, 09:15 GMT', icon: 'swap_horiz' },
  { title: 'Archivé', current: false, actor: 'Système SignSecure (Auto)', actorIcon: 'dns', time: '12 Oct 2023, 11:45 GMT', icon: 'inventory_2' },
  { title: 'Reçu', current: false, actor: 'API Partenaire (Banque Atlantique)', actorIcon: 'api', time: '12 Oct 2023, 11:42 GMT', icon: 'inbox' },
]

export function TraceabilityDetail() {
  return (
    <AppShell active="trace">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg">
                <Icon name="description" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Contrat Partenariat B2B</h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant mt-1">
                  DOC-2023-8942
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 py-4 border-y border-outline-variant">
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Statut actuel</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-[#e8f5e9] text-[#1b5e20]">Réception confirmée</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Créé le</span>
                <span className="font-label-md text-label-md text-on-surface">12 Oct 2023</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Niveau de sécurité</span>
                <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface">
                  <Icon name="shield_lock" size={16} className="text-primary" />
                  Élevé
                </span>
              </div>
            </div>
            <button className="w-full py-2 border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors mt-2 flex items-center justify-center gap-2">
              <Icon name="download" />
              Télécharger l'Audit
            </button>
          </div>
        </div>

        <div className="lg:w-2/3">
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-8 border-b border-outline-variant pb-4">Chaîne de Garde (Custody Timeline)</h3>
            <div className="relative pl-6 space-y-8">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant" />
              <div className="absolute left-[7px] top-2 w-0.5 bg-primary" style={{ height: 'calc(25% - 8px)' }} />
              {TIMELINE.map((step) => (
                <div key={step.title} className="relative">
                  <div
                    className={`absolute -left-6 flex items-center justify-center w-8 h-8 rounded-full border-4 border-surface-container-lowest shrink-0 shadow-sm z-10 ${
                      step.current ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    <Icon name={step.icon} size={16} />
                  </div>
                  <div
                    className={`ml-6 rounded-xl p-5 border shadow-sm ${
                      step.current ? 'bg-surface border-primary/30' : 'bg-surface-container-lowest border-outline-variant opacity-80 hover:opacity-100 transition-opacity'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-label-md text-label-md font-bold ${step.current ? 'text-primary' : 'text-on-surface'}`}>{step.title}</span>
                      {step.current && <span className="inline-flex px-1.5 py-0.5 bg-primary-container text-on-primary-container text-[10px] rounded font-bold">ACTUEL</span>}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <Icon name={step.actorIcon} size={14} />
                      {step.actor}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-2 flex items-center gap-1">
                      <Icon name="schedule" size={14} />
                      {step.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
