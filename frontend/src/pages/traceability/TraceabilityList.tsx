import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES, traceabilityDetailUrl } from '../../routes'

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

// GET /api/documents n'a pas de filtre `origine` dans API_CONTRACT.md (seulement
// statut/type/date) — on récupère tout et on filtre côté client sur origine=trace.
export function TraceabilityList() {
  const navigate = useNavigate()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<DocumentsResponse>('/documents', { signal: controller.signal })
      .then((res) => setDossiers(res.dossiers.filter((d) => d.origine === 'trace')))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les documents tracés.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

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
        </div>

        {error && (
          <div className="mb-4">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}
        {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Chargement…</p>}
        {!loading && !error && dossiers.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun document tracé pour l'instant.</p>}

        <div className="flex flex-col gap-4">
          {dossiers.map((doc) => (
            <button
              key={doc.id}
              onClick={() => navigate(traceabilityDetailUrl(doc.id))}
              className="text-left bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex flex-col gap-3 hover:bg-surface-bright transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <Icon name="folder" />
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{doc.titre}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <Icon name="tag" size={14} /> {doc.trackingCode}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-surface-container text-on-surface">
                  <Icon name="task_alt" size={12} />
                  {doc.statut}
                </span>
              </div>
              <div className="pt-2 border-t border-surface-variant flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={16} /> {doc.date}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
