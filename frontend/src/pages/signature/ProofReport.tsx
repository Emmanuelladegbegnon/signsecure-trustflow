import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { PdfViewer } from '../../components/ui/PdfViewer'
import { apiRequest, ApiRequestError, fetchAuthedFileUrl } from '../../lib/httpClient'

// Forme de GET /api/documents/:id/rapport-preuve — rapport structuré en 5
// blocs (expéditeur, signataire, authentification, contexte et dates,
// empreinte), voir backend/src/modules/sign/service.ts#getProofReport.
interface ProofSignatory {
  nom: string
  email: string
  telephone: string
  identite: string
  signe: boolean
  methode: string | null
  authentification: { lienUnique: boolean; canauxOtp: string[] }
  contexte: { ip: string | null; userAgent: string | null }
  dates: { consentement: string | null; validation: string | null }
}

interface ProofTimelineEntry {
  type: string
  acteur?: string
  date?: string
  details?: string
}

interface ProofReportData {
  titre: string
  codeReference: string | null
  statut: string
  expediteur: { nom: string; organisation: string; dateCreation: string; dateEnvoi: string | null }
  signataires: ProofSignatory[]
  empreinte: {
    sha256Final: string | null
    sha256Original: string | null
    nombrePages: number | null
    cachet: { date: string; nature: string; empreinteCertificat: string | null; conformeAuCertificatPublie: boolean } | null
    horodatageTiers: { date: string; service: string | null } | null
  }
  journal: { chaineIntacte: boolean }
  timeline: ProofTimelineEntry[]
  hash: string | null
  disclaimer: string
}

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }) : '—'

const OTP_LABELS: Record<string, string> = { sms: 'Code SMS', email: 'Code email' }

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-surface-container-low p-3 rounded-lg">
      <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1 uppercase">{label}</span>
      <span className={mono ? 'font-mono text-[12px] break-all text-on-surface' : 'font-body-sm text-body-sm text-on-surface'}>{children}</span>
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
      <Icon name={icon} />
      {children}
    </h2>
  )
}

export function ProofReport() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<ProofReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Aperçu du PDF — GET /api/documents/:id/fichier, endpoint authentifié
  // (jamais de chemin de stockage exposé). Optionnel : son échec n'empêche
  // pas de consulter le reste du rapport de preuve.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

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
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger le rapport de preuve.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    fetchAuthedFileUrl(`/documents/${id}/fichier`, controller.signal)
      .then((url) => {
        objectUrl = url
        setPdfUrl(url)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setPdfError(err instanceof ApiRequestError ? err.message : "Impossible de charger l'aperçu du document.")
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
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
            <section className="print:hidden">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="visibility" />
                Aperçu du document
              </h2>
              {pdfUrl && <PdfViewer url={pdfUrl} className="w-full h-[600px] rounded-lg border border-outline-variant p-4 bg-surface-container-low" />}
              {!pdfUrl && pdfError && <FormAlert tone="error">{pdfError}</FormAlert>}
              {!pdfUrl && !pdfError && <div className="h-[600px] rounded-lg border border-outline-variant bg-surface-container-low animate-pulse" />}
            </section>

            <section>
              <SectionTitle icon="outgoing_mail">1. Expéditeur</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Émis par">{data.expediteur.nom}</Field>
                <Field label="Organisation">{data.expediteur.organisation}</Field>
                <Field label="Dossier créé le">{formatDate(data.expediteur.dateCreation)}</Field>
                <Field label="Envoyé pour signature le">{formatDate(data.expediteur.dateEnvoi)}</Field>
                {data.codeReference && <Field label="Code de suivi">{data.codeReference}</Field>}
              </div>
            </section>

            {data.signataires.map((s, i) => (
              <section key={`${s.email}-${i}`} className="print-break-inside-avoid flex flex-col gap-6">
                <div>
                  <SectionTitle icon="person">2. Signataire{data.signataires.length > 1 ? ` ${i + 1}` : ''} — {s.nom}</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Email">{s.email}</Field>
                    <Field label="Téléphone">{s.telephone}</Field>
                    <Field label="Statut">{s.signe ? `Signé (${s.methode ?? 'manuscrite'})` : 'Signature non effectuée'}</Field>
                  </div>
                  <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
                    <Icon name="info" size={16} />
                    {s.identite}
                  </p>
                </div>

                <div>
                  <SectionTitle icon="key">3. Authentification</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Lien de signature">{s.authentification.lienUnique ? 'Lien personnel, à usage unique, à durée limitée' : '—'}</Field>
                    <Field label="Codes à usage unique validés">
                      {s.authentification.canauxOtp.length ? s.authentification.canauxOtp.map((c) => OTP_LABELS[c] ?? c).join(' + ') : '—'}
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle icon="schedule">4. Contexte et dates (horloge du serveur)</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Consentement coché le">{formatDate(s.dates.consentement)}</Field>
                    <Field label="Signature validée le">{formatDate(s.dates.validation)}</Field>
                    <Field label="Adresse IP">{s.contexte.ip ?? '—'}</Field>
                    <Field label="Navigateur / appareil" mono>
                      {s.contexte.userAgent ?? '—'}
                    </Field>
                  </div>
                </div>
              </section>
            ))}

            <section className="print-break-inside-avoid">
              <SectionTitle icon="fingerprint">5. Empreinte et intégrité</SectionTitle>
              <div className="grid grid-cols-1 gap-3">
                <Field label="SHA-256 de la version finale scellée" mono>
                  {data.empreinte.sha256Final ?? 'Pas encore de version finale (signatures en attente)'}
                </Field>
                <Field label="SHA-256 du PDF déposé (avant signature)" mono>
                  {data.empreinte.sha256Original ?? '—'}
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nombre de pages">{data.empreinte.nombrePages ?? '—'}</Field>
                  <Field label="Cachet de plateforme">
                    {data.empreinte.cachet ? `${data.empreinte.cachet.nature} — ${formatDate(data.empreinte.cachet.date)}` : '—'}
                  </Field>
                  {data.empreinte.cachet?.empreinteCertificat && (
                    <Field label="Certificat du cachet (SHA-256)" mono>
                      {data.empreinte.cachet.empreinteCertificat}
                      {data.empreinte.cachet.conformeAuCertificatPublie
                        ? ' — identique au certificat publié'
                        : ' — DIFFÉRENT du certificat actuellement publié : changement de clé à expliquer'}
                    </Field>
                  )}
                  <Field label="Horodatage par un tiers (RFC 3161)">
                    {data.empreinte.horodatageTiers
                      ? `${formatDate(data.empreinte.horodatageTiers.date)}${data.empreinte.horodatageTiers.service ? ` — ${data.empreinte.horodatageTiers.service}` : ''}`
                      : 'Non effectué'}
                  </Field>
                  <Field label="Journal d'audit chaîné">
                    {data.journal.chaineIntacte ? 'Conforme au contrôle de chaînage' : 'Rupture de chaîne détectée — alerter un administrateur'}
                  </Field>
                </div>
                {data.empreinte.horodatageTiers && id && (
                  <button
                    type="button"
                    className="print:hidden self-start inline-flex items-center gap-2 px-3 py-2 border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-container-low"
                    onClick={async () => {
                      const url = await fetchAuthedFileUrl(`/documents/${id}/horodatage`)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `horodatage-${data.codeReference ?? id}.tsr`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Icon name="download" size={18} />
                    Télécharger le jeton d'horodatage (.tsr)
                  </button>
                )}
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
