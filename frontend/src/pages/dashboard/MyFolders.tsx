import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { StatusChip, type StatusKind } from '../../components/ui/StatusChip'
import { ROUTES } from '../../routes'

const FOLDERS: Array<{ code: string; title: string; type: string; status: StatusKind; statusLabel: string; origin: string; date: string }> = [
  { code: 'SS-7K4M', title: 'Contrat de prestation', type: 'PDF', status: 'valide', statusLabel: 'Signé', origin: 'SignSecure', date: '12/05/2024' },
  { code: 'SS-9B2Q', title: 'Accord de Confidentialité', type: 'PDF', status: 'attente', statusLabel: 'En attente', origin: 'Client Interne', date: '10/05/2024' },
]

export function MyFolders() {
  const navigate = useNavigate()

  return (
    <AppShell active="dashboard" bleed>
      <div className="px-margin-mobile md:px-margin-desktop py-8 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface-container-lowest">
        <div>
          <h2 className="font-display text-display text-on-surface">Mes dossiers</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Gérez et suivez l'état de vos documents légaux.</p>
        </div>
        <button
          className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm self-start md:self-auto"
          onClick={() => navigate(ROUTES.newDocument)}
        >
          <Icon name="add_circle" />
          Nouveau dossier
        </button>
      </div>

      <div className="px-margin-mobile md:px-margin-desktop py-6 max-w-container-max mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Rechercher par titre ou code..."
              type="text"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {['Statut', 'Date', 'Type'].map((label) => (
              <button
                key={label}
                className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-center gap-2 font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
              >
                {label}
                <Icon name="expand_more" size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Code de suivi</th>
                  <th className="px-6 py-4 font-semibold">Titre</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Origine</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/20">
                {FOLDERS.map((folder) => (
                  <tr key={folder.code} className="hover:bg-surface-bright transition-colors group">
                    <td className="px-6 py-4 font-medium text-primary">{folder.code}</td>
                    <td className="px-6 py-4 font-medium text-on-surface">{folder.title}</td>
                    <td className="px-6 py-4 text-on-surface-variant flex items-center gap-2">
                      <Icon name="picture_as_pdf" className="text-error" size={20} />
                      {folder.type}
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={folder.status} label={folder.statusLabel} />
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{folder.origin}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{folder.date}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high">
                        <Icon name="more_vert" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Affichage 1 à {FOLDERS.length} sur 12</span>
            <div className="flex gap-2">
              <button className="p-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50" disabled>
                <Icon name="chevron_left" />
              </button>
              <button className="p-1 rounded border border-outline-variant text-on-surface hover:bg-surface-container-high">
                <Icon name="chevron_right" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
