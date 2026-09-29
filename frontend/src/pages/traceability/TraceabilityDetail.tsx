import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError, fetchAuthedFileUrl } from '../../lib/httpClient'
import { traceIncidentUrl, traceTransferRequestUrl } from '../../routes'
import { TraceComparisonPanel } from './TraceComparisonPanel'

interface TimelineEvent {
  type: string
  acteur?: string
  date?: string
  details?: string
}

interface TimelineResponse {
  evenements: TimelineEvent[]
}

interface PhotoMeta {
  id: string
  pageIndex: number
  url: string
  /** Empreinte SHA-256 calculée par le serveur à la réception de la photo. */
  sha256?: string | null
  dateCapture?: string
}

interface PhotosResponse {
  photos: PhotoMeta[]
}

export function TraceabilityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)

  // Photos/scans de référence capturés à la réception — élément constitutif
  // du dossier de preuve (CLAUDE.md § Trace). Chargées via un endpoint
  // authentifié, jamais par URL de stockage directe.
  const [photos, setPhotos] = useState<PhotoMeta[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [photosLoading, setPhotosLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    apiRequest<TimelineResponse>(`/trace/${id}/timeline`, { signal: controller.signal })
      .then((res) => setEvents(res.evenements))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger la chaîne de garde.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const objectUrls: string[] = []
    setPhotosLoading(true)
    apiRequest<PhotosResponse>(`/trace/${id}/photos`, { signal: controller.signal })
      .then(async (res) => {
        setPhotos(res.photos)
        const entries = await Promise.all(
          res.photos.map(async (p) => {
            try {
              const url = await fetchAuthedFileUrl(p.url, controller.signal)
              objectUrls.push(url)
              return [p.id, url] as const
            } catch {
              return null
            }
          }),
        )
        setPhotoUrls(Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null)))
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setPhotosError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les photos de référence.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setPhotosLoading(false)
      })
    return () => {
      controller.abort()
      objectUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [id])

  const handleArchive = async () => {
    if (!id || archiving) return
    setArchiveError(null)
    setArchiving(true)
    try {
      await apiRequest(`/trace/${id}/archiver`, { method: 'POST' })
      setArchived(true)
    } catch (err) {
      setArchiveError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) return <FullscreenSpinner />

  // Le plus récent en premier — hypothèse : le serveur renvoie l'ordre chronologique.
  const timeline = [...(events ?? [])].reverse()

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
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                  {id}
                </span>
              </div>
            </div>

            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Photos de référence</span>
              {photosLoading && <div className="h-24 rounded-lg border border-outline-variant bg-surface-container-low animate-pulse" />}
              {!photosLoading && photosError && <FormAlert tone="error">{photosError}</FormAlert>}
              {!photosLoading && !photosError && photos.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Aucune photo capturée pour ce dossier.</p>
              )}
              {!photosLoading && photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p) =>
                    photoUrls[p.id] ? (
                      <a
                        key={p.id}
                        href={photoUrls[p.id]}
                        target="_blank"
                        rel="noreferrer"
                        title={`Page ${p.pageIndex + 1}${p.sha256 ? ` — SHA-256 ${p.sha256}` : ''}`}
                      >
                        <img
                          src={photoUrls[p.id]}
                          alt={`Référence page ${p.pageIndex + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border border-outline-variant hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div key={p.id} className="w-full aspect-square rounded-lg border border-outline-variant bg-surface-container-low" />
                    ),
                  )}
                </div>
              )}
              {!photosLoading && photos.some((p) => p.sha256) && (
                <ul className="mt-2 flex flex-col gap-0.5 font-mono text-[10px] text-on-surface-variant">
                  {photos.map((p) => (
                    <li key={p.id} title={p.sha256 ?? undefined}>
                      p.{p.pageIndex + 1} · {p.sha256 ? `${p.sha256.slice(0, 12)}…` : '—'}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {archived && (
              <div className="pt-2">
                <FormAlert tone="success">Ce dossier a été archivé.</FormAlert>
              </div>
            )}
            {archiveError && (
              <div className="pt-2">
                <FormAlert tone="error">{archiveError}</FormAlert>
              </div>
            )}

            {!archived && (
              <div className="flex flex-col gap-2 mt-2">
                <button
                  className="w-full py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
                  onClick={() => id && navigate(traceTransferRequestUrl(id))}
                  type="button"
                >
                  <Icon name="send" />
                  Demander un transfert
                </button>
                <button
                  className="w-full py-2 border border-outline-variant text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors flex items-center justify-center gap-2"
                  onClick={() => id && navigate(traceIncidentUrl(id))}
                  type="button"
                >
                  <Icon name="report" />
                  Déclarer un incident
                </button>
                <button
                  className="w-full py-2 border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  onClick={handleArchive}
                  disabled={archiving}
                  type="button"
                >
                  {archiving ? (
                    <span className="w-4 h-4 rounded-full border-2 border-outline/40 border-t-outline animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon name="archive" />
                  )}
                  {archiving ? 'Archivage…' : 'Archiver ce dossier'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-2/3">
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-8 border-b border-outline-variant pb-4">Chaîne de Garde (Custody Timeline)</h3>

            {error && <FormAlert tone="error">{error}</FormAlert>}
            {!error && timeline.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun événement pour ce dossier.</p>}

            {timeline.length > 0 && (
              <div className="relative pl-6 space-y-8">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant" />
                {timeline.map((event, i) => {
                  const current = i === 0
                  return (
                    <div key={`${event.type}-${i}`} className="relative">
                      <div
                        className={`absolute -left-6 flex items-center justify-center w-8 h-8 rounded-full border-4 border-surface-container-lowest shrink-0 shadow-sm z-10 ${
                          current ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        <Icon name={current ? 'check_circle' : 'fiber_manual_record'} size={16} />
                      </div>
                      <div
                        className={`ml-6 rounded-xl p-5 border shadow-sm ${
                          current ? 'bg-surface border-primary/30' : 'bg-surface-container-lowest border-outline-variant opacity-80 hover:opacity-100 transition-opacity'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-label-md text-label-md font-bold ${current ? 'text-primary' : 'text-on-surface'}`}>{event.type}</span>
                          {current && <span className="inline-flex px-1.5 py-0.5 bg-primary-container text-on-primary-container text-[10px] rounded font-bold">ACTUEL</span>}
                        </div>
                        {event.acteur && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                            <Icon name="person" size={14} />
                            {event.acteur}
                          </p>
                        )}
                        {event.date && (
                          <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-2 flex items-center gap-1">
                            <Icon name="schedule" size={14} />
                            {event.date}
                          </p>
                        )}
                        {event.details && <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{event.details}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {id && <TraceComparisonPanel documentId={id} photos={photos} photoUrls={photoUrls} />}
        </div>
      </div>
    </AppShell>
  )
}
