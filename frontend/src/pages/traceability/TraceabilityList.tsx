import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

const TRACKED = [
  {
    icon: 'folder',
    iconTone: 'text-primary',
    title: 'Contrat de Prestation - Alpha SA',
    code: 'TRC-2023-0891',
    status: 'En transit',
    statusClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    location: 'Abidjan, Plateau',
    locationIcon: 'location_on',
    updated: 'Mis à jour à 14:30',
  },
  {
    icon: 'gavel',
    iconTone: 'text-primary',
    title: 'Acte Notarié - Succession K.',
    code: 'TRC-2023-0885',
    status: 'Archivé',
    statusClass: 'bg-primary-fixed text-on-primary-fixed',
    location: 'Coffre Fort Central',
    locationIcon: 'assured_workload',
    updated: 'Hier, 09:15',
  },
  {
    icon: 'warning',
    iconTone: 'text-error',
    title: 'Avenant Bail Commercial',
    code: 'TRC-2023-0870',
    status: 'Anomalie',
    statusClass: 'bg-error-container text-on-error-container',
    location: 'Localisation Inconnue',
    locationIcon: 'help_center',
    updated: 'Il y a 2 jours',
  },
] as const

export function TraceabilityList() {
  const navigate = useNavigate()

  return (
    <AppShell active="trace">
      <section className="mb-8">
        <button
          className="w-full bg-primary text-on-primary py-4 px-6 rounded-xl shadow-md hover:bg-primary-container transition-colors duration-200 flex flex-col items-center justify-center gap-2 active:scale-[0.98]"
          onClick={() => navigate(ROUTES.mobileRegistrationStep1)}
        >
          <Icon name="document_scanner" size={30} />
          <span className="font-headline-sm text-headline-sm">Enregistrer un document physique</span>
        </button>
      </section>

      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Documents en cours de traçabilité</h2>
          <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">
            Filtrer <Icon name="filter_list" size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {TRACKED.map((doc) => (
            <button
              key={doc.code}
              onClick={() => navigate(ROUTES.traceabilityDetail)}
              className="text-left bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex flex-col gap-3 hover:bg-surface-bright transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-surface-container flex items-center justify-center ${doc.iconTone}`}>
                    <Icon name={doc.icon} />
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{doc.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <Icon name="tag" size={14} /> {doc.code}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${doc.statusClass}`}>{doc.status}</span>
              </div>
              <div className="pt-2 border-t border-surface-variant flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <Icon name={doc.locationIcon} size={16} /> {doc.location}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={16} /> {doc.updated}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
