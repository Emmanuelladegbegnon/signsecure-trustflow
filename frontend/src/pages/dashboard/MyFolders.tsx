import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { DOCUMENT_TYPES } from '../../constants/documentTypes'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES, proofReportUrl, traceabilityDetailUrl } from '../../routes'
import { documentOrigineLabel, documentStatutLabel } from '../../constants/documentStatus'
import { useAuth } from '../../auth/AuthContext'
import { canAccess } from '../../auth/access'

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

// API_CONTRACT.md ne fixe pas d'énumération pour `statut` — libellés à
// confirmer avec le back ; envoyés tels quels en query param pour l'instant.
const STATUT_OPTIONS = ['Signé', 'En attente', 'Rejeté', 'Révoqué']

export function MyFolders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  // Recherche serveur (intitulé, code, référence, organisme, nom ou email d'un
  // signataire) : retrouver un dossier dont le code imprimé est illisible ou douteux.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (statutFilter) params.set('statut', statutFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (dateFilter) params.set('date', dateFilter)
    if (debouncedSearch) params.set('q', debouncedSearch)
    const query = params.toString()

    apiRequest<DocumentsResponse>(`/documents${query ? `?${query}` : ''}`, { signal: controller.signal })
      .then((res) => setDossiers(res.dossiers))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger vos dossiers.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [statutFilter, typeFilter, dateFilter, debouncedSearch])

  const filtered = dossiers

  const hasActiveFilters = Boolean(statutFilter || typeFilter || dateFilter)
  const clearFilters = () => {
    setStatutFilter('')
    setTypeFilter('')
    setDateFilter('')
  }

  return (
    <AppShell active="dashboard" bleed>
      <div className="px-margin-mobile md:px-margin-desktop py-8 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface-container-lowest">
        <div>
          <h2 className="font-display text-display text-on-surface">Mes dossiers</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Gérez et suivez l'état de vos documents légaux.</p>
        </div>
        {canAccess('sign', user?.roles) && (
          <button
            className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm self-start md:self-auto"
            onClick={() => navigate(ROUTES.newDocument)}
          >
            <Icon name="add_circle" />
            Nouveau dossier
          </button>
        )}
      </div>

      <div className="px-margin-mobile md:px-margin-desktop py-6 max-w-container-max mx-auto w-full">
        {error && (
          <div className="mb-6">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Titre, code, référence, nom ou email d’un signataire…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {STATUT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tous les types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {hasActiveFilters && (
              <button className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1" onClick={clearFilters} type="button">
                <Icon name="close" size={14} />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Code de suivi</th>
                  <th className="px-6 py-4 font-semibold">Titre</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Origine</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/20">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                      Chargement…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                      Aucun dossier {search || hasActiveFilters ? 'ne correspond à ces critères' : "pour l'instant"}.
                    </td>
                  </tr>
                )}
                {filtered.map((dossier) => {
                  // Deux écrans de détail distincts selon l'origine (Sign a un
                  // rapport de preuve dédié ; Trace n'existe pas côté SIGN) —
                  // envoyer un dossier Trace vers /rapport-de-preuve échouerait
                  // (l'endpoint filtre origine=SIGN).
                  const isTrace = dossier.origine === 'TRACE'
                  // Trace reste filtré par rôle (auth/access.ts) : un compte qui
                  // n'y a pas accès voit la ligne dans sa liste (GET /documents
                  // n'est pas filtré par origine) mais ne doit pas cliquer vers
                  // un écran dont il serait aussitôt reboté.
                  const detailUrl = isTrace ? (canAccess('trace', user?.roles) ? traceabilityDetailUrl(dossier.id) : null) : proofReportUrl(dossier.id)
                  return (
                    <tr
                      key={dossier.id}
                      className={`hover:bg-surface-bright transition-colors group ${detailUrl ? 'cursor-pointer' : ''}`}
                      onClick={detailUrl ? () => navigate(detailUrl) : undefined}
                    >
                      <td className="px-6 py-4 font-medium text-primary">{dossier.trackingCode}</td>
                      <td className="px-6 py-4 font-medium text-on-surface">{dossier.titre}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                          <Icon name="task_alt" size={14} />
                          {documentStatutLabel(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{documentOrigineLabel(dossier.origine)}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{new Date(dossier.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-6 py-4 text-right">
                        {detailUrl && (
                          <button
                            className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(detailUrl)
                            }}
                            title={isTrace ? 'Voir la chaîne de garde' : 'Voir le rapport de preuve'}
                          >
                            <Icon name="visibility" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
