import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'

interface AuditRow {
  timestamp: string
  actor: string
  actorSub: string
  actorInitials: string
  actorTone: 'primary' | 'neutral' | 'tertiary'
  action: string
  actionIcon: string
  actionTone: 'neutral' | 'muted' | 'error'
  object: string
  objectSub: string
  status: string
  statusTone: 'ok' | 'error'
}

const ROWS: AuditRow[] = [
  {
    timestamp: '2023-10-24 14:32:01',
    actor: 'Awa KONE',
    actorSub: 'ID: usr_8f92a1',
    actorInitials: 'AK',
    actorTone: 'primary',
    action: 'SIGNATURE_APPOSÉE',
    actionIcon: 'edit_document',
    actionTone: 'neutral',
    object: 'Contrat_Partenariat_Q3.pdf',
    objectSub: '0x9f86...0a08',
    status: 'Succès',
    statusTone: 'ok',
  },
  {
    timestamp: '2023-10-24 14:30:15',
    actor: 'Système',
    actorSub: 'Automatisé',
    actorInitials: 'dns',
    actorTone: 'neutral',
    action: 'VÉRIFICATION_HASH',
    actionIcon: 'verified',
    actionTone: 'muted',
    object: 'Doc_Preuve_ID_742.png',
    objectSub: '0x5e88...42d8',
    status: 'Valide',
    statusTone: 'ok',
  },
  {
    timestamp: '2023-10-24 11:15:42',
    actor: 'API Externe',
    actorSub: 'IP: 192.168.1.45',
    actorInitials: 'API',
    actorTone: 'tertiary',
    action: 'TENTATIVE_ACCÈS',
    actionIcon: 'lock_open_right',
    actionTone: 'error',
    object: 'Dossier_Confidentiel_RH',
    objectSub: 'Ref: DIR_8829',
    status: 'Échec (403)',
    statusTone: 'error',
  },
]

const ACTOR_AVATAR: Record<AuditRow['actorTone'], string> = {
  primary: 'bg-primary-container text-on-primary-container',
  neutral: 'bg-surface-variant text-on-surface-variant',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
}

const ACTION_CHIP: Record<AuditRow['actionTone'], string> = {
  neutral: 'bg-secondary-fixed text-on-secondary-fixed',
  muted: 'bg-surface-variant text-on-surface',
  error: 'bg-error-container text-on-error-container',
}

export function AuditLog() {
  return (
    <AppShell active="audit">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-display text-display text-on-surface">Journal d'Audit</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Traçabilité complète des actions système et utilisateurs.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 border border-outline-variant px-4 py-2 rounded-lg text-on-surface-variant font-label-md text-label-md hover:bg-surface transition-colors bg-white shadow-sm">
            <Icon name="download" />
            Exporter (CSV)
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
            <Icon name="filter_list" />
            Filtres Avancés
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col mt-8">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant w-full sm:w-auto">
              <Icon name="calendar_today" size={18} className="text-on-surface-variant" />
              <select className="bg-transparent border-none text-body-sm text-on-surface focus:ring-0 p-0 pr-6 w-full cursor-pointer">
                <option>Aujourd'hui</option>
                <option>7 derniers jours</option>
                <option>30 derniers jours</option>
                <option>Période personnalisée...</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant w-full sm:w-auto">
              <Icon name="person" size={18} className="text-on-surface-variant" />
              <select className="bg-transparent border-none text-body-sm text-on-surface focus:ring-0 p-0 pr-6 w-full cursor-pointer">
                <option>Tous les acteurs</option>
                <option>Awa KONE</option>
                <option>Système</option>
                <option>API Externe</option>
              </select>
            </div>
          </div>
          <div className="text-body-sm text-on-surface-variant whitespace-nowrap">Affichage de 1-10 sur 2,451 entrées</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Horodatage</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Acteur</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Action</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Objet</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-white">
              {ROWS.map((row) => (
                <tr key={row.timestamp} className={`hover:bg-surface transition-colors ${row.statusTone === 'error' ? 'bg-error-container/10' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="font-mono text-body-sm text-on-surface">{row.timestamp}</div>
                    <div className="font-body-sm text-xs text-on-surface-variant mt-1">GMT+0</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${ACTOR_AVATAR[row.actorTone]}`}>
                        {row.actorInitials.length <= 3 && /^[A-Z]+$/.test(row.actorInitials) ? row.actorInitials : <Icon name={row.actorInitials} size={16} />}
                      </div>
                      <div>
                        <div className="font-body-sm text-on-surface font-medium">{row.actor}</div>
                        <div className="font-mono text-xs text-on-surface-variant">{row.actorSub}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${ACTION_CHIP[row.actionTone]}`}>
                      <Icon name={row.actionIcon} size={14} />
                      {row.action}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-body-sm text-on-surface">{row.object}</div>
                    <div className="font-mono text-xs text-on-surface-variant mt-1 truncate max-w-[150px]">{row.objectSub}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${row.statusTone === 'ok' ? 'bg-surface-tint' : 'bg-error'}`} />
                      <span className={`font-body-sm ${row.statusTone === 'error' ? 'text-error font-medium' : 'text-on-surface'}`}>{row.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary disabled:opacity-50 font-label-md text-label-md transition-colors" disabled>
            <Icon name="chevron_left" />
            Précédent
          </button>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md">1</button>
            <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high font-label-md text-label-md">2</button>
            <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high font-label-md text-label-md">3</button>
            <span className="w-8 h-8 flex items-center justify-center text-on-surface-variant">...</span>
            <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high font-label-md text-label-md">245</button>
          </div>
          <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors">
            Suivant
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>
    </AppShell>
  )
}
