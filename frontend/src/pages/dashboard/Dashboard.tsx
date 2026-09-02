import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { StatusChip } from '../../components/ui/StatusChip'
import { ROUTES } from '../../routes'

const STATS = [
  { label: 'Documents Signés', value: '1,284', trend: '+12%', tone: 'up' as const },
  { label: 'En Attente', value: '42', trend: '0%', tone: 'flat' as const },
  { label: 'Vérifications (Mois)', value: '8,930', trend: '+5.4%', tone: 'up' as const },
  { label: 'Anomalies Détectées', value: '3', trend: '-2', tone: 'down' as const },
  { label: 'Actifs Tracés', value: '450', trend: '+18%', tone: 'up' as const },
  { label: 'Taux de Conformité', value: '99.8%', trend: '+0.1%', tone: 'up' as const },
]

const ACTIVITY = [
  { icon: 'description', name: 'Contrat_Fournisseur_Tech_2023.pdf', type: 'Signature B2B', status: 'valide', date: '12 Oct 2023, 14:30', actor: 'Awa KONE' },
  { icon: 'qr_code', name: 'Certificat_Origine_Cacao_Lot89.xml', type: 'Vérification QR', status: 'attente', date: '12 Oct 2023, 11:15', actor: 'Moussa DIALLO' },
  { icon: 'inventory_2', name: 'Titre_Foncier_Parcelle_A12.pdf', type: 'Traçabilité', status: 'enregistre', date: '11 Oct 2023, 09:45', actor: 'Système Auto' },
  { icon: 'description', name: 'Accord_Confidentialité_ProjetX.docx', type: 'Signature Interne', status: 'rejete', date: '10 Oct 2023, 16:20', actor: 'Awa KONE' },
] as const

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <AppShell active="dashboard">
      <div className="mb-8">
        <h2 className="font-display text-display text-on-surface mb-2">Bonjour, Awa</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Voici un aperçu de vos activités de confiance aujourd'hui.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <button
          className="bg-primary text-on-primary p-6 rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] flex flex-col items-start gap-4 hover:bg-primary/90 transition-colors text-left group"
          onClick={() => navigate(ROUTES.newDocument)}
        >
          <div className="p-3 bg-white/20 rounded-lg group-hover:scale-105 transition-transform">
            <Icon name="edit_document" filled className="text-3xl" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold mb-1">Signer un document</h3>
            <p className="font-body-sm text-body-sm text-on-primary/80">Initier un nouveau flux de signature sécurisé.</p>
          </div>
        </button>
        <button
          className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] flex flex-col items-start gap-4 hover:border-primary hover:shadow-md transition-all text-left group"
          onClick={() => navigate(ROUTES.verifyPublic)}
        >
          <div className="p-3 bg-surface-container rounded-lg group-hover:bg-primary/10 transition-colors text-primary">
            <Icon name="verified_user" className="text-3xl" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">Vérifier un code</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Scanner un QR code pour vérifier.</p>
          </div>
        </button>
        <button
          className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] flex flex-col items-start gap-4 hover:border-primary hover:shadow-md transition-all text-left group"
          onClick={() => navigate(ROUTES.traceabilityList)}
        >
          <div className="p-3 bg-surface-container rounded-lg group-hover:bg-primary/10 transition-colors text-primary">
            <Icon name="inventory_2" className="text-3xl" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">Tracer un document</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Suivre le cycle de vie d'un actif physique.</p>
          </div>
        </button>
      </div>

      <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Vue d'ensemble</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">{stat.label}</span>
            <div className="flex items-end justify-between">
              <span className="font-headline-lg text-headline-lg text-on-surface">{stat.value}</span>
              <span
                className={`flex items-center font-label-sm text-label-sm px-2 py-1 rounded ${
                  stat.tone === 'up'
                    ? 'text-primary bg-primary/10'
                    : stat.tone === 'down'
                      ? 'text-error bg-error-container'
                      : 'text-secondary bg-surface-container'
                }`}
              >
                <Icon name={stat.tone === 'up' ? 'trending_up' : stat.tone === 'down' ? 'trending_down' : 'trending_flat'} size={16} className="mr-1" />
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Activité Récente</h3>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Nom du document</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Type</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Statut</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Date</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Acteur</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface">
              {ACTIVITY.map((row) => (
                <tr key={row.name} className="border-b border-outline-variant last:border-b-0 hover:bg-surface transition-colors cursor-pointer group">
                  <td className="p-4 flex items-center gap-3">
                    <Icon name={row.icon} className="text-outline group-hover:text-primary" />
                    <span className="font-medium">{row.name}</span>
                  </td>
                  <td className="p-4 text-on-surface-variant">{row.type}</td>
                  <td className="p-4">
                    <StatusChip status={row.status} />
                  </td>
                  <td className="p-4 text-on-surface-variant">{row.date}</td>
                  <td className="p-4">{row.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface flex justify-center">
          <button className="text-primary font-label-md text-label-md font-semibold hover:underline" onClick={() => navigate(ROUTES.myFolders)}>
            Voir tout l'historique
          </button>
        </div>
      </div>
    </AppShell>
  )
}
