import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAuth } from '../../auth/AuthContext'
import { canAccess } from '../../auth/access'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { documentOrigineLabel, documentStatutChipKind, documentStatutLabel } from '../../constants/documentStatus'
import { ROUTES, proofReportUrl, traceabilityDetailUrl } from '../../routes'

interface Dossier {
  id: string
  trackingCode: string
  titre: string
  statut: string
  origine: string
  date: string
}

interface DocumentsResponse {
  dossiers: Dossier[]
}

const DOCUMENT_ICON: Record<string, string> = { SIGN: 'description', TRACE: 'inventory_2' }

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<DocumentsResponse>('/documents', { signal: controller.signal })
      .then((res) => setDossiers(res.dossiers))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — ce n'est pas un vrai échec réseau, et le montrer
        // écraserait durablement l'état avec un message d'erreur périmé.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger vos dossiers.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  // Statistiques dérivées des dossiers réellement accessibles à ce compte
  // (l'API scope déjà par organisation) — jamais de chiffre inventé : on
  // n'affiche que ce qu'on peut honnêtement compter depuis les données reçues.
  const stats = useMemo(() => {
    const signes = dossiers.filter((d) => d.statut === 'SIGNED').length
    const enAttente = dossiers.filter((d) => d.statut === 'PENDING_SIGNATURES' || d.statut === 'DRAFT').length
    const traces = dossiers.filter((d) => d.origine === 'TRACE').length
    const revoques = dossiers.filter((d) => d.statut === 'REVOKED').length
    return [
      { label: 'Documents signés', value: signes },
      { label: 'En attente', value: enAttente },
      { label: 'Actifs tracés', value: traces },
      { label: 'Révoqués', value: revoques },
    ]
  }, [dossiers])

  const recent = useMemo(() => dossiers.slice(0, 6), [dossiers])

  return (
    <AppShell active="dashboard">
      <div className="mb-8">
        <h2 className="font-display text-display text-on-surface mb-2">Bonjour{user ? `, ${user.prenom}` : ''}</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Voici un aperçu de vos activités de confiance aujourd'hui.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {canAccess('sign', user?.roles) && (
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
        )}
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
        {canAccess('trace', user?.roles) && (
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
        )}
      </div>

      <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Vue d'ensemble</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">{stat.label}</span>
            <span className="font-headline-lg text-headline-lg text-on-surface">{loading ? '—' : stat.value}</span>
          </div>
        ))}
      </div>

      <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Activité récente</h3>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Nom du document</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Origine</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Statut</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface">
              {loading && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-on-surface-variant">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-error">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-on-surface-variant">
                    Aucun dossier pour l'instant.
                  </td>
                </tr>
              )}
              {recent.map((row) => {
                // Chaque origine a son propre écran de détail, et Trace reste
                // filtré par rôle (voir auth/access.ts) — une ligne n'est
                // cliquable que si l'écran de destination est réellement
                // accessible à ce compte, jamais un clic qui ne mène nulle part.
                const detailUrl = row.origine === 'TRACE' ? (canAccess('trace', user?.roles) ? traceabilityDetailUrl(row.id) : null) : proofReportUrl(row.id)
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-outline-variant last:border-b-0 transition-colors group ${
                      detailUrl ? 'hover:bg-surface cursor-pointer' : ''
                    }`}
                    onClick={detailUrl ? () => navigate(detailUrl) : undefined}
                  >
                    <td className="p-4 flex items-center gap-3">
                      <Icon name={DOCUMENT_ICON[row.origine] ?? 'description'} className="text-outline group-hover:text-primary" />
                      <span className="font-medium">{row.titre}</span>
                    </td>
                    <td className="p-4 text-on-surface-variant">{documentOrigineLabel(row.origine)}</td>
                    <td className="p-4">
                      <StatusChip status={documentStatutChipKind(row.statut)} label={documentStatutLabel(row.statut)} />
                    </td>
                    <td className="p-4 text-on-surface-variant">{new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  </tr>
                )
              })}
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
