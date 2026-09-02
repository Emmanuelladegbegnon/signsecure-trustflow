import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

// NOTE : API_CONTRACT.md ne détaille pas le sous-schéma de `signataires` et
// `timeline` (juste "[...]"), ni de champ titre/référence pour le document.
// Formes déduites par analogie avec les autres endpoints du contrat
// (rapport_de_preuve mock, /api/trace/:id/timeline, /api/admin/audit) — à
// confirmer avec le back ; le rendu tolère les champs manquants.
interface ProofSignatory {
  nom: string
  ip?: string
  timestamp?: string
  methode?: string
}

interface ProofTimelineEntry {
  type: string
  acteur?: string
  date?: string
  details?: string
}

interface ProofReportData {
  titre?: string
  codeReference?: string
  signataires: ProofSignatory[]
  timeline: ProofTimelineEntry[]
  hash: string
  disclaimer: string
}

export function ProofReport() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<ProofReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // POST /documents/:id/revoquer exige le rôle Superviseur — vérifié aussi
  // côté serveur ; ce contrôle client n'est qu'un confort d'affichage.
  const canRevoke = user?.roles.includes('Superviseur') ?? false
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [motif, setMotif] = useState('')
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [revoked, setRevoked] = useState(false)

  const handleRevoke = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !motif.trim()) {
      setRevokeError('Le motif de révocation est requis.')
      return
    }
    setRevokeError(null)
    setRevoking(true)
    try {
      await apiRequest(`/documents/${id}/revoquer`, { method: 'POST', body: { motif: motif.trim() } })
      setRevoked(true)
      setRevokeOpen(false)
    } catch (err) {
      setRevokeError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setRevoking(false)
    }
  }

  useEffect(() => {
    if (!id) {
      setError('Identifiant de dossier manquant.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    apiRequest<ProofReportData>(`/documents/${id}/rapport-preuve`, { signal: controller.signal })
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger le rapport de preuve.'))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id])

  if (loading) return <FullscreenSpinner />

  if (error || !data) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-margin-mobile">
        <div className="max-w-md w-full">
          <FormAlert tone="error">{error ?? 'Rapport indisponible.'}</FormAlert>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background min-h-screen">
      <main className="w-full flex justify-center py-margin-desktop px-margin-mobile">
        <div className="max-w-[800px] w-full bg-surface-container-lowest shadow-lg rounded-xl overflow-hidden border border-outline-variant print:shadow-none print:border-0">
          <header className="p-8 border-b border-outline-variant flex justify-between items-start bg-surface">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Rapport de Preuve de Signature</h1>
              {data.titre && (
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                  <Icon name="description" size={18} />
                  {data.titre}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="font-headline-md text-headline-md font-bold text-primary mb-1">SignSecure TrustFlow</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Rapport de Preuve</div>
            </div>
          </header>

          {revoked && (
            <div className="px-8 pt-8">
              <FormAlert tone="success">Ce document a été révoqué. Son statut apparaîtra comme révoqué dans Verify.</FormAlert>
            </div>
          )}

          {canRevoke && !revoked && (
            <div className="px-8 pt-8 print:hidden">
              {!revokeOpen ? (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors"
                  onClick={() => setRevokeOpen(true)}
                  type="button"
                >
                  <Icon name="block" size={18} />
                  Révoquer ce document
                </button>
              ) : (
                <form className="bg-error-container/30 border border-error/30 rounded-lg p-4 flex flex-col gap-3" onSubmit={handleRevoke}>
                  {revokeError && <FormAlert tone="error">{revokeError}</FormAlert>}
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="motif-revocation">
                    Motif de révocation *
                  </label>
                  <textarea
                    id="motif-revocation"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    rows={3}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Ex: Compromission présumée de la clé privée du signataire"
                  />
                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                      type="button"
                      onClick={() => setRevokeOpen(false)}
                      disabled={revoking}
                    >
                      Annuler
                    </button>
                    <button
                      className="flex-1 py-2 rounded-lg bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                      type="submit"
                      disabled={revoking}
                    >
                      {revoking && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
                      {revoking ? 'Révocation…' : 'Confirmer la révocation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="p-8 space-y-10">
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="description" />
                Informations Document
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body-sm text-body-sm">
                {data.codeReference && (
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">CODE DE RÉFÉRENCE</span>
                    <span className="font-body-md text-body-md font-medium text-on-surface">{data.codeReference}</span>
                  </div>
                )}
                <div className="col-span-1 md:col-span-2 bg-surface-container-low p-4 rounded-lg">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">EMPREINTE HASH (SHA-256)</span>
                  <code className="font-mono text-[13px] break-all text-on-surface">{data.hash}</code>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="group" />
                Signataires
              </h2>
              <div className="overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="p-3 font-label-md text-label-md text-on-surface">Nom</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Adresse IP</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Horodatage</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Méthode</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm">
                    {data.signataires.map((s, i) => (
                      <tr key={`${s.nom}-${i}`} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright transition-colors">
                        <td className="p-3 font-medium text-on-surface">{s.nom}</td>
                        <td className="p-3 text-on-surface-variant">{s.ip ?? '—'}</td>
                        <td className="p-3 text-on-surface-variant">{s.timestamp ?? '—'}</td>
                        <td className="p-3">
                          {s.methode && (
                            <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm text-label-sm">
                              <Icon name="smartphone" size={14} />
                              {s.methode}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print-break-inside-avoid">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="history" />
                Journal d'Audit
              </h2>
              <div className="relative pl-6 border-l-2 border-outline-variant space-y-8 ml-4">
                {data.timeline.map((entry, i) => (
                  <div key={`${entry.type}-${i}`} className="relative">
                    <div className="absolute -left-[35px] bg-surface-container-lowest border-2 border-primary rounded-full p-1 text-primary">
                      <Icon name="fiber_manual_record" size={16} />
                    </div>
                    {entry.date && <div className="font-label-sm text-label-sm text-on-surface-variant mb-1">{entry.date}</div>}
                    <div className="font-body-md text-body-md font-medium text-on-surface">{entry.type}</div>
                    {(entry.acteur || entry.details) && (
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {entry.acteur}
                        {entry.acteur && entry.details ? ' — ' : ''}
                        {entry.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="bg-surface-container-low p-6 border-t border-outline-variant">
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center max-w-2xl mx-auto">{data.disclaimer}</p>
            <div className="mt-4 text-center print:hidden">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-colors"
                onClick={() => window.print()}
              >
                <Icon name="print" />
                Imprimer / PDF
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
