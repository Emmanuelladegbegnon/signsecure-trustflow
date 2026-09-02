import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PublicVerifyShell } from '../../components/layout/PublicVerifyShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

// Formes déduites d'API_CONTRACT.md — voir la même note dans VerificationResult.tsx.
interface VerifyReference {
  statut: string
  origine?: string
  signature?: { nom?: string; role?: string }
}

interface CompareResult {
  methode: 'hash_exact' | 'ocr_score'
  resultat: 'correspond' | 'diverge'
  score?: number
}

export function FileComparison() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [reference, setReference] = useState<VerifyReference | null>(null)
  const [loadingReference, setLoadingReference] = useState(true)
  const [referenceError, setReferenceError] = useState<string | null>(null)

  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)

  useEffect(() => {
    if (!code) return
    const controller = new AbortController()
    apiRequest<VerifyReference>(`/verify/${code}`, { auth: false, signal: controller.signal })
      .then((res) => setReference(res))
      .catch((err) => setReferenceError(err instanceof ApiRequestError ? err.message : 'Impossible de charger le document de référence.'))
      .finally(() => setLoadingReference(false))
    return () => controller.abort()
  }, [code])

  const submitComparison = async (candidate: File) => {
    if (!code) return
    setCompareError(null)
    setResult(null)
    setComparing(true)
    const formData = new FormData()
    formData.append('fichier', candidate)
    try {
      const res = await apiRequest<CompareResult>(`/verify/${code}/comparer`, { method: 'POST', body: formData, auth: false })
      setResult(res)
    } catch (err) {
      setCompareError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setComparing(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      submitComparison(dropped)
    }
  }

  return (
    <PublicVerifyShell>
      <div className="flex items-center gap-2 mb-2">
        <button className="p-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant lg:hidden" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Vérification par fichier</h1>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-8">
        Comparez un document soumis avec la référence enregistrée sous le code <strong>{code}</strong>. Selon l'origine du document, la comparaison
        utilise soit un hash exact, soit un score de correspondance textuelle (OCR) — jamais un verdict d'identité absolue sur un document scanné.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex items-center gap-4 pb-4 border-b border-outline-variant/30">
            <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <Icon name="description" size={28} />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Document de Référence</h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Code : {code}</span>
            </div>
          </div>

          {loadingReference && <FullscreenSpinner />}
          {referenceError && <FormAlert tone="error">{referenceError}</FormAlert>}
          {reference && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-label-md text-label-md text-on-surface-variant">Statut</span>
                <span className="font-body-md text-body-md font-medium text-on-surface">{reference.statut}</span>
              </div>
              {reference.signature?.nom && (
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-on-surface-variant">Signataire / Déclarant</span>
                  <span className="font-body-md text-body-md font-medium text-on-surface">{reference.signature.nom}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col h-full">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Fichier à comparer</h2>

          {compareError && (
            <div className="mb-4">
              <FormAlert tone="error">{compareError}</FormAlert>
            </div>
          )}

          {result && (
            <div className="mb-4">
              <FormAlert tone={result.methode === 'ocr_score' ? 'info' : result.resultat === 'correspond' ? 'success' : 'error'}>
                {result.methode === 'ocr_score'
                  ? `Correspondance textuelle (OCR) : ${result.score ?? '—'}%. Un document scanné ne permet pas un hash exact — ce score indique une correspondance, pas une identité garantie.`
                  : result.resultat === 'correspond'
                    ? 'Le hash du fichier soumis correspond exactement à la référence enregistrée.'
                    : "Le hash du fichier soumis ne correspond pas à la référence enregistrée."}
              </FormAlert>
            </div>
          )}

          <div
            className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative group min-h-[250px] ${
              dragActive ? 'border-primary bg-primary-container/10' : 'border-outline-variant bg-surface hover:bg-surface-container-high'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              aria-label="Téléverser un fichier pour comparaison"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              type="file"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) {
                  setFile(selected)
                  submitComparison(selected)
                }
              }}
            />
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
              {comparing ? (
                <span className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" aria-hidden="true" />
              ) : (
                <Icon name="upload_file" size={28} />
              )}
            </div>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-2">{comparing ? 'Analyse en cours…' : (file?.name ?? 'Glissez-déposez le fichier ici')}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">ou cliquez pour parcourir</p>
            <button className="bg-surface-container-lowest border border-outline text-on-surface font-label-md py-2 px-4 rounded-lg shadow-sm" type="button">
              Sélectionner un fichier
            </button>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 opacity-70">PDF ou image scannée. Taille max: 10 Mo.</p>
          </div>
        </div>
      </div>
    </PublicVerifyShell>
  )
}
