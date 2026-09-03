import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PublicVerifyShell } from '../../components/layout/PublicVerifyShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { compareFilesUrl, ROUTES } from '../../routes'

// API_CONTRACT.md ne détaille que les clés de premier niveau de la réponse
// ({ statut, origine, integrite, signature, tracabilite, revocation }), sans
// sous-schéma ni champ titre/référence pour le document lui-même. Formes
// déduites par analogie avec le reste du contrat (comparer, rapport-preuve,
// trace/timeline) — à confirmer avec le back. Rendu tolérant aux champs
// manquants ; le code de suivi affiché vient de l'URL, seule donnée sûre.
interface VerifyIntegrite {
  methode?: 'hash_exact' | 'ocr_score'
  resultat?: 'correspond' | 'diverge'
  score?: number
  hash?: string
}
interface VerifySignature {
  nom?: string
  role?: string
  certificat?: string
}
interface VerifyTracabiliteEntry {
  label?: string
  date?: string
}
interface VerifyRevocation {
  motif?: string
  date?: string
}
interface VerifyResponse {
  statut: string
  origine?: string
  integrite?: VerifyIntegrite
  signature?: VerifySignature
  tracabilite?: VerifyTracabiliteEntry[]
  revocation?: VerifyRevocation | null
}

export function VerificationResult() {
  const { code } = useParams<{ code: string }>()
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
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Impossible de contacter le service de vérification.'))
      .finally(() => setLoading(false))
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

  if (!data || data.statut === 'UNKNOWN_CODE') {
    return (
      <PublicVerifyShell>
        <div className="max-w-md w-full mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-surface-container flex items-center justify-center">
            <Icon name="search" size={48} className="text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Aucun dossier ne correspond à ce code</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Nous n'avons pas pu trouver de document associé au code « {code} ». Vérifiez les caractères et réessayez.
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

  const isRevoked = data.statut.toUpperCase().includes('REVOQ')
  const isTrace = data.origine === 'trace'

  if (isRevoked) {
    return (
      <PublicVerifyShell>
        <div className="flex flex-col gap-2 mb-8">
          <button className="flex items-center gap-2 text-primary font-label-md text-label-md w-fit hover:underline" onClick={() => navigate(ROUTES.verifyPublic)}>
            <Icon name="arrow_back" />
            Retour au scan
          </button>
          <h1 className="font-display text-display text-on-background">Résultat d'Analyse</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Code de suivi : {code}</p>
        </div>

        <div className="bg-error-container rounded-xl p-6 border-l-4 border-error shadow-sm flex items-start gap-4 mb-8">
          <Icon name="warning" filled className="text-error text-3xl" />
          <div className="flex-1">
            <h2 className="font-headline-md text-headline-md text-on-error-container mb-2">Document Révoqué</h2>
            <p className="font-body-md text-body-md text-on-error-container/80 mb-4">
              Ce document a été explicitement révoqué. Il ne doit plus être considéré comme valide pour toute transaction légale ou financière.
            </p>
            {data.revocation && (
              <div className="bg-surface-container-lowest/50 rounded-lg p-4 font-body-sm text-body-sm text-on-error-container flex flex-col gap-1">
                {data.revocation.motif && (
                  <div className="flex justify-between border-b border-error/20 pb-2">
                    <span className="font-semibold">Motif de révocation:</span>
                    <span>{data.revocation.motif}</span>
                  </div>
                )}
                {data.revocation.date && (
                  <div className="flex justify-between pt-2">
                    <span className="font-semibold">Date de révocation:</span>
                    <span>{data.revocation.date}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {data.signature?.nom && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 grayscale-[50%]">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                <Icon name="cancel" size={16} /> Invalide
              </div>
              <div className="flex items-center gap-3 text-secondary">
                <Icon name="person_cancel" />
                <h3 className="font-headline-sm text-headline-sm">Identité Signataire</h3>
              </div>
              <div className="flex-1 flex flex-col gap-3 mt-4">
                <div className="font-body-md text-body-md font-semibold text-on-surface">{data.signature.nom}</div>
                {data.signature.role && <div className="font-body-sm text-body-sm text-on-surface-variant">{data.signature.role}</div>}
                {data.signature.certificat && (
                  <div className="mt-2 border-t border-outline-variant pt-3">
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Certificat</div>
                    <div className="font-body-sm text-body-sm text-on-surface text-error">{data.signature.certificat}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PublicVerifyShell>
    )
  }

  return (
    <PublicVerifyShell>
      <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-4 flex items-center gap-4 mb-8 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-[#4caf50] text-white flex items-center justify-center shrink-0">
          <Icon name="check" size={24} />
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-[#2e7d32]">Document enregistré — statut {data.statut.toLowerCase()}</h2>
          <p className="font-body-sm text-body-sm text-[#1b5e20] opacity-80">Code de suivi : {code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="trip_origin" className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm">Origine</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center mb-4">
              <Icon name={isTrace ? 'photo_camera' : 'security'} size={32} className="text-primary" />
            </div>
            <span className="font-label-md text-label-md font-bold text-primary mb-2">{isTrace ? 'Enregistré via Trace' : 'Signé dans SignSecure'}</span>
          </div>
        </div>

        {data.integrite && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="data_check" className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm">Intégrité</h3>
            </div>
            {data.integrite.methode === 'ocr_score' ? (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Comparaison textuelle (OCR)</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#e8f5e9] text-[#2e7d32] rounded-md font-label-sm text-label-sm">
                    <Icon name="percent" size={14} />
                    {data.integrite.score != null ? `${data.integrite.score}% de correspondance` : 'Score indisponible'}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface p-3 rounded-lg border border-outline-variant/50">
                  Document scanné : pas de hash exact possible. Ce score indique une correspondance, pas une identité garantie.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Hash correspondant</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-label-sm text-label-sm ${
                      data.integrite.resultat === 'diverge' ? 'bg-error-container text-on-error-container' : 'bg-[#e8f5e9] text-[#2e7d32]'
                    }`}
                  >
                    <Icon name={data.integrite.resultat === 'diverge' ? 'cancel' : 'check_circle'} size={14} />
                    {data.integrite.resultat === 'diverge' ? 'Ne correspond pas' : 'Correspondance exacte'}
                  </span>
                </div>
                {data.integrite.hash && (
                  <div className="bg-surface p-3 rounded-lg border border-outline-variant/50 break-all font-mono text-[11px] text-on-surface-variant">
                    {data.integrite.hash}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {data.signature?.nom && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Icon name={isTrace ? 'inventory_2' : 'draw'} className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm">{isTrace ? 'Déclarant' : 'Signature'}</h3>
            </div>
            <div className="flex-1">
              <span className="font-label-md text-label-md font-semibold block">{data.signature.nom}</span>
              {data.signature.role && <span className="font-body-sm text-body-sm text-on-surface-variant block">{data.signature.role}</span>}
              {data.signature.certificat && <span className="font-label-sm text-label-sm text-primary mt-1 block">{data.signature.certificat}</span>}
            </div>
          </div>
        )}

        {data.tracabilite && data.tracabilite.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="history" className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm">Traçabilité</h3>
            </div>
            <div className="flex-1 relative pl-4 border-l-2 border-outline-variant/30 space-y-4">
              {data.tracabilite.map((entry, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white" />
                  {entry.date && <span className="font-label-sm text-label-sm text-on-surface-variant block">{entry.date}</span>}
                  <span className="font-body-sm text-body-sm font-medium">{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isTrace && (
        <button
          className="font-label-md text-label-md text-primary hover:underline flex items-center gap-2"
          onClick={() => code && navigate(compareFilesUrl(code))}
        >
          <Icon name="upload_file" size={18} />
          Comparer un fichier scanné avec cette référence
        </button>
      )}
    </PublicVerifyShell>
  )
}
