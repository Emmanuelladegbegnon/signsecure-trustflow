import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES, traceabilityDetailUrl, traceTransferReceptionUrl } from '../../routes'
import { CodeLabel } from '../mobile/CodeLabel'

interface Dossier {
  id: string
  trackingCode: string | null
  titre: string
  statut: string
  origine: string
  date: string
}

interface DocumentsResponse {
  dossiers: Dossier[]
}

interface IncomingTransfer {
  id: string
  document: { id: string; titre: string; trackingCode: string | null }
  expediteur: string
  lieu: string | null
  motif: string | null
  date: string
}

interface ValidateResponse {
  trackingCode: string
  etiquetteUrl: string
}

const STATUT_LABELS: Record<string, string> = {
  DRAFT: 'En attente de validation',
  RECEIVED: 'Reçu',
  ARCHIVED: 'Archivé',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

// GET /api/documents n'a pas de filtre `origine` dans API_CONTRACT.md (seulement
// statut/type/date) — on récupère tout et on filtre côté client sur origine=TRACE.
export function TraceabilityList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // POST /trace/:id/valider exige le rôle Superviseur — vérifié aussi côté serveur.
  const canValidate = user?.roles.includes('Superviseur') ?? false

  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [incoming, setIncoming] = useState<IncomingTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [validateError, setValidateError] = useState<{ id: string; message: string } | null>(null)
  const [label, setLabel] = useState<ValidateResponse | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    return Promise.all([
      apiRequest<DocumentsResponse>('/documents', { signal }),
      apiRequest<{ transferts: IncomingTransfer[] }>('/trace/transferts/a-recevoir', { signal }),
    ])
      .then(([docs, transfers]) => {
        setDossiers(docs.dossiers.filter((d) => d.origine === 'TRACE'))
        setIncoming(transfers.transferts)
        setError(null)
      })
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (signal?.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les documents tracés.')
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const handleValidate = async (id: string) => {
    if (validatingId) return
    setValidateError(null)
    setValidatingId(id)
    try {
      setLabel(await apiRequest<ValidateResponse>(`/trace/${id}/valider`, { method: 'POST' }))
    } catch (err) {
      setValidateError({ id, message: err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.' })
    } finally {
      setValidatingId(null)
    }
  }

  if (label) {
    return (
      <CodeLabel
        trackingCode={label.trackingCode}
        etiquetteUrl={label.etiquetteUrl}
        onFinish={() => {
          setLabel(null)
          setLoading(true)
          load()
        }}
      />
    )
  }

  const drafts = dossiers.filter((d) => d.statut === 'DRAFT')
  const others = dossiers.filter((d) => d.statut !== 'DRAFT')

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

      {error && (
        <div className="mb-4">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}
      {loading && <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Chargement…</p>}

      {incoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Documents à recevoir</h2>
          <div className="flex flex-col gap-3">
            {incoming.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(traceTransferReceptionUrl(t.id))}
                className="text-left bg-secondary-container/40 rounded-xl p-4 border border-outline-variant flex items-center gap-3 hover:bg-secondary-container/60 transition-colors"
              >
                <Icon name="move_to_inbox" className="text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-label-md text-on-surface truncate">{t.document.titre}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    De {t.expediteur} · {formatDate(t.date)}
                    {t.lieu ? ` · ${t.lieu}` : ''}
                  </p>
                </div>
                <span className="font-label-sm text-label-sm text-primary shrink-0">Confirmer la réception</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">En attente de validation</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
            {canValidate
              ? 'Vérifiez les photos dans le détail du dossier, puis validez pour générer le code de suivi et l’étiquette.'
              : 'Un superviseur doit valider ces dossiers avant que le code de suivi soit généré.'}
          </p>
          <div className="flex flex-col gap-3">
            {drafts.map((doc) => (
              <div key={doc.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="hourglass_top" className="text-on-surface-variant" />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{doc.titre}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Enregistré le {formatDate(doc.date)}</p>
                  </div>
                </div>
                {validateError?.id === doc.id && <FormAlert tone="error">{validateError.message}</FormAlert>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                    onClick={() => navigate(traceabilityDetailUrl(doc.id))}
                  >
                    Voir le détail
                  </button>
                  {canValidate && (
                    <button
                      type="button"
                      className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                      onClick={() => handleValidate(doc.id)}
                      disabled={validatingId !== null}
                    >
                      {validatingId === doc.id ? 'Validation…' : 'Valider'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Documents en cours de traçabilité</h2>
        </div>

        {!loading && !error && others.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun document tracé pour l'instant.</p>}

        <div className="flex flex-col gap-4">
          {others.map((doc) => (
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
                  {STATUT_LABELS[doc.statut] ?? doc.statut}
                </span>
              </div>
              <div className="pt-2 border-t border-surface-variant flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={16} /> {formatDate(doc.date)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
