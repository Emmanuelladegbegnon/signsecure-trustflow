import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PdfViewer } from '../../components/ui/PdfViewer'
import { PublicVerifyShell } from '../../components/layout/PublicVerifyShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { documentStatutLabel } from '../../constants/documentStatus'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { compareFilesUrl, ROUTES } from '../../routes'

// Forme de GET /api/verify/:code (voir API_CONTRACT.md § 3 et
// backend/src/modules/verify/service.ts). Réponse publique minimale : jamais
// de nom de personne, d'adresse ni de détail d'incident.
interface VerifySignResponse {
  statut: string
  origine: 'SIGN'
  integrite: {
    methode: 'hash_exact'
    hashDisponible: boolean
    hash: string | null
    nombrePages: number | null
    cachetPlateforme: boolean
    empreinteCertificatCachet: string | null
    horodatageTiers: string | null
    apercuParPage: boolean
  }
  signature: { type: string; titre: string; dateScellement: string | null }
  revocation?: { revoque: true; date: string | null }
}
interface VerifyTraceResponse {
  statut: string
  origine: 'TRACE'
  integrite: { methode: 'examen_humain' }
  tracabilite: { reference: string | null; nombrePages: number | null; dateEnregistrement: string; incidentEnCours: boolean }
}
type VerifyResponse = VerifySignResponse | VerifyTraceResponse | { statut: 'UNKNOWN_CODE'; controle?: 'CARACTERE_DE_CONTROLE_INVALIDE' }

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

/**
 * Aperçu scellé de la page dont on a scanné le QR (jeton lié au code et à la
 * page). On compare la feuille qu'on a en main à cet aperçu : une page
 * substituée, même avec un QR recopié, ne ressemble pas à l'aperçu.
 */
function PagePreview({ code, page, token }: { code: string; page: number; token: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [total, setTotal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    fetch(`${API_BASE_URL}/verify/${encodeURIComponent(code)}/pages/${page}?k=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
          throw new Error(body?.error?.message ?? "Ce lien de page n'est pas reconnu.")
        }
        setTotal(res.headers.get('X-Nombre-Pages'))
        objectUrl = URL.createObjectURL(await res.blob())
        setUrl(objectUrl)
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message)
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [code, page, token])

  return (
    <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 mb-6">
      <h3 className="font-headline-sm text-headline-sm mb-2 flex items-center gap-2">
        <Icon name="compare" className="text-primary" /> Page {page}
        {total ? ` sur ${total}` : ''} telle qu'elle a été scellée
      </h3>
      {error ? (
        <FormAlert tone="error">
          {error} Un QR qui ne mène pas ici peut avoir été fabriqué : saisissez le code de suivi à la main.
        </FormAlert>
      ) : (
        <>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
            Comparez cette page, mot à mot, avec la feuille que vous avez en main. Si le texte, les montants ou les paraphes diffèrent, votre
            page a été remplacée ou modifiée après la signature.
          </p>
          {url ? (
            <PdfViewer url={url} className="w-full h-[640px] rounded-lg border border-outline-variant p-2 bg-surface-container-low" />
          ) : (
            <div className="h-[640px] rounded-lg border border-outline-variant bg-surface-container-low animate-pulse" />
          )}
        </>
      )}
    </section>
  )
}

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '—'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-outline-variant/40 last:border-0">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <span className="font-body-md text-body-md text-on-surface text-right">{children}</span>
    </div>
  )
}

export function VerificationResult() {
  const { code } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const pageParam = Number(searchParams.get('page'))
  const pageToken = searchParams.get('k')
  const navigate = useNavigate()
  const [data, setData] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    apiRequest<VerifyResponse>(`/verify/${encodeURIComponent(code)}`, { auth: false, signal: controller.signal })
      .then((res) => setData(res))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de contacter le service de vérification.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [code])

  if (loading) return <FullscreenSpinner />

  if (error) {
    return (
      <PublicVerifyShell>
        <div className="max-w-md mx-auto">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      </PublicVerifyShell>
    )
  }

  if (!data || data.statut === 'UNKNOWN_CODE' || !('origine' in data)) {
    return (
      <PublicVerifyShell>
        <div className="max-w-md w-full mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-surface-container flex items-center justify-center">
            <Icon name="search" size={48} className="text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Aucun dossier ne correspond à ce code</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            {data && 'controle' in data && data.controle
              ? `Le code « ${code} » n'est pas valide : son caractère de contrôle ne correspond pas. Faute de frappe, ou code modifié sur le document.`
              : `Nous n'avons pas pu trouver de document associé au code « ${code} ». Vérifiez les caractères et réessayez.`}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8">
            Vous avez le fichier PDF ? Retrouvez son code en le déposant sur la page de vérification.
          </p>
          <button
            className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3 px-8 rounded-lg shadow-sm transition-colors w-full md:w-auto"
            onClick={() => navigate(ROUTES.verifyPublic)}
          >
            Réessayer
          </button>
        </div>
      </PublicVerifyShell>
    )
  }

  const isRevoked = data.statut === 'REVOKED'
  const isTrace = data.origine === 'TRACE'
  const isFinal = data.statut === 'SIGNED' || data.statut === 'REVOKED'

  return (
    <PublicVerifyShell>
      <div className="flex flex-col gap-2 mb-6">
        <button className="flex items-center gap-2 text-primary font-label-md text-label-md w-fit hover:underline" onClick={() => navigate(ROUTES.verifyPublic)}>
          <Icon name="arrow_back" />
          Nouvelle vérification
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-background">Résultat de la vérification</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Code de suivi : {code}</p>
      </div>

      {isRevoked ? (
        <div className="bg-error-container rounded-xl p-6 border-l-4 border-error shadow-sm flex items-start gap-4 mb-6">
          <Icon name="warning" filled className="text-error text-3xl" />
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-error-container mb-1">Document révoqué</h2>
            <p className="font-body-md text-body-md text-on-error-container/80">
              Ce document a été révoqué par l'organisation émettrice le {formatDate(data.origine === 'SIGN' ? data.revocation?.date : null)}. Il ne doit plus être
              utilisé.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-4 flex items-center gap-4 mb-6 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#4caf50] text-white flex items-center justify-center shrink-0">
            <Icon name="check" size={24} />
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-[#2e7d32]">Document enregistré — {documentStatutLabel(data.statut).toLowerCase()}</h2>
            <p className="font-body-sm text-body-sm text-[#1b5e20] opacity-80">
              {isTrace ? 'Document papier enregistré via Trace' : 'Document signé électroniquement dans SignSecure'}
            </p>
          </div>
        </div>
      )}

      {!isTrace && pageToken && Number.isInteger(pageParam) && pageParam > 0 && code && (
        <PagePreview code={code} page={pageParam} token={pageToken} />
      )}

      {!isTrace && (
        <p className="font-body-sm text-body-sm text-on-surface mb-6 flex items-start gap-2">
          <Icon name="fact_check" size={18} className="text-primary shrink-0 mt-0.5" />
          Vérifiez que l'intitulé, le nombre de pages et la date ci-dessous correspondent à votre document. Sinon, le code imprimé renvoie vers
          un autre dossier : il a pu être modifié.
        </p>
      )}

      {!isTrace && data.origine === 'SIGN' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-headline-sm mb-3 flex items-center gap-2">
              <Icon name="description" className="text-primary" /> Document
            </h3>
            <Row label="Intitulé">{data.signature.titre}</Row>
            <Row label="Nombre de pages">{data.integrite.nombrePages ?? '—'}</Row>
            <Row label="Version finale scellée le">{formatDate(data.signature.dateScellement)}</Row>
          </section>

          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-headline-sm mb-3 flex items-center gap-2">
              <Icon name="data_check" className="text-primary" /> Contrôles effectués
            </h3>
            <Row label="Empreinte de référence">{data.integrite.hashDisponible ? 'SHA-256 enregistrée' : 'Pas encore de version finale'}</Row>
            <Row label="Cachet de plateforme">{data.integrite.cachetPlateforme ? 'Présent (démonstration, non qualifié)' : '—'}</Row>
            {data.integrite.empreinteCertificatCachet && (
              <Row label="Certificat du cachet">
                <span className="font-mono text-[10px] break-all" title="À comparer avec l'empreinte publiée sur la page Données personnelles">
                  {data.integrite.empreinteCertificatCachet.slice(0, 23)}…
                </span>
              </Row>
            )}
            <Row label="Horodatage par un tiers">{data.integrite.horodatageTiers ? formatDate(data.integrite.horodatageTiers) : 'Non'}</Row>
            {data.integrite.hash && (
              <div className="mt-3 bg-surface p-3 rounded-lg border border-outline-variant/50 break-all font-mono text-[11px] text-on-surface-variant">
                {data.integrite.hash}
              </div>
            )}
          </section>
        </div>
      )}

      {!isTrace && isFinal && (
        <div className="bg-secondary-container/40 rounded-xl p-5 border border-outline-variant/40 mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <p className="font-body-sm text-body-sm text-on-surface flex-1">
            <strong>Le statut ci-dessus ne prouve pas que votre exemplaire est intact.</strong> Un PDF modifié peut porter le même QR code. Pour
            contrôler votre fichier, soumettez-le : son empreinte sera comparée exactement à la version finale enregistrée.
          </p>
          <button
            className="bg-primary text-on-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center gap-2 shrink-0"
            onClick={() => code && navigate(compareFilesUrl(code))}
          >
            <Icon name="upload_file" size={18} />
            Contrôler mon fichier PDF
          </button>
        </div>
      )}

      {isTrace && data.origine === 'TRACE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-headline-sm mb-3 flex items-center gap-2">
              <Icon name="inventory_2" className="text-primary" /> Enregistrement
            </h3>
            {data.tracabilite.reference && <Row label="Référence">{data.tracabilite.reference}</Row>}
            <Row label="Nombre de pages déclaré">{data.tracabilite.nombrePages ?? '—'}</Row>
            <Row label="Enregistré le (heure serveur)">{formatDate(data.tracabilite.dateEnregistrement)}</Row>
            <Row label="Incident">{data.tracabilite.incidentEnCours ? 'Incident en cours' : 'Aucun signalé'}</Row>
          </section>
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-headline-sm mb-3 flex items-center gap-2">
              <Icon name="compare" className="text-primary" /> Comparaison d'une copie
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Un document papier photographié ou scanné ne peut pas être comparé automatiquement de façon fiable. Pour faire contrôler une
              copie, présentez-la à l'organisation émettrice : un vérificateur l'examinera à côté des photos prises à la réception et
              consignera son constat.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
              Cet enregistrement atteste qu'un document a été déclaré reçu à cette date ; il ne se prononce pas sur l'authenticité de son
              contenu.
            </p>
          </section>
        </div>
      )}
    </PublicVerifyShell>
  )
}
