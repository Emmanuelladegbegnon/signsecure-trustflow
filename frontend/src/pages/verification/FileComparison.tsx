import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PublicVerifyShell } from '../../components/layout/PublicVerifyShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { FullscreenSpinner } from '../../components/ui/FullscreenSpinner'
import { Icon } from '../../components/ui/Icon'
import { documentStatutLabel } from '../../constants/documentStatus'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

interface VerifyReference {
  statut: string
  origine?: 'SIGN' | 'TRACE'
  signature?: { titre?: string }
}

type CompareResult =
  | {
      methode: 'hash_exact'
      resultat: 'correspond' | 'diverge'
      hashSoumis: string
      hashReference: string
      marquesInvisibles?: { presentes: boolean; memeDocument: boolean; autreDocument: boolean; pagesDOrigine: number | null; pagesSansMarque: number[]; marquesFalsifiees: number }
    }
  | { methode: 'examen_humain'; message: string }

/**
 * Contrôle d'un fichier par un tiers, sans compte. Seul un PDF né dans Sign
 * se compare automatiquement (empreinte SHA-256 exacte). Une copie d'un
 * document Trace n'est jamais comparée automatiquement (CLAUDE.md § Verify).
 */
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
    apiRequest<VerifyReference>(`/verify/${encodeURIComponent(code)}`, { auth: false, signal: controller.signal })
      .then((res) => setReference(res))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setReferenceError(err instanceof ApiRequestError ? err.message : 'Impossible de charger le document de référence.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingReference(false)
      })
    return () => controller.abort()
  }, [code])

  const submitComparison = async (candidate: File) => {
    if (!code) return
    setFile(candidate)
    setCompareError(null)
    setResult(null)
    setComparing(true)
    const formData = new FormData()
    formData.append('fichier', candidate)
    try {
      setResult(await apiRequest<CompareResult>(`/verify/${encodeURIComponent(code)}/comparer`, { method: 'POST', body: formData, auth: false }))
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
    if (dropped) submitComparison(dropped)
  }

  const isTrace = reference?.origine === 'TRACE'
  const unknown = reference?.statut === 'UNKNOWN_CODE'

  return (
    <PublicVerifyShell>
      <div className="flex items-center gap-2 mb-2">
        <button className="p-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant lg:hidden" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Contrôler un fichier</h1>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-8">
        Comparez votre exemplaire avec la version finale enregistrée sous le code <strong>{code}</strong>. Le fichier soumis sert uniquement au
        calcul de son empreinte : il n'est pas conservé.
      </p>

      {loadingReference && <FullscreenSpinner />}
      {referenceError && <FormAlert tone="error">{referenceError}</FormAlert>}
      {unknown && <FormAlert tone="error">Aucun dossier ne correspond à ce code.</FormAlert>}

      {reference && !unknown && isTrace && (
        <div className="max-w-2xl">
          <FormAlert tone="info">
            Ce code correspond à un document papier enregistré via Trace. Une photo ou un scan ne peut pas être comparé automatiquement de façon
            fiable : présentez la copie à l'organisation émettrice, qui la fera examiner par un vérificateur à côté des photos prises à la réception.
          </FormAlert>
        </div>
      )}

      {reference && !unknown && !isTrace && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center gap-4 pb-4 border-b border-outline-variant/30">
              <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <Icon name="description" size={28} />
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Document de référence</h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Code : {code}</span>
              </div>
            </div>
            {reference.signature?.titre && (
              <div className="flex justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Intitulé</span>
                <span className="font-body-md text-body-md text-on-surface">{reference.signature.titre}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Statut</span>
              <span className="font-body-md text-body-md text-on-surface">{documentStatutLabel(reference.statut)}</span>
            </div>
            {reference.statut === 'REVOKED' && <FormAlert tone="error">Ce document a été révoqué par l'organisation émettrice.</FormAlert>}
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col h-full">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Votre fichier PDF</h2>

            {compareError && (
              <div className="mb-4">
                <FormAlert tone="error">{compareError}</FormAlert>
              </div>
            )}

            {result?.methode === 'hash_exact' && (
              <div className="mb-4 flex flex-col gap-2">
                <FormAlert tone={result.resultat === 'correspond' ? 'success' : 'error'}>
                  {result.resultat === 'correspond'
                    ? "L'empreinte SHA-256 de votre fichier correspond exactement à celle de la version finale enregistrée : il n'a pas été modifié depuis son scellement."
                    : "L'empreinte de votre fichier ne correspond pas à la version finale enregistrée : le fichier a été modifié, ou il ne s'agit pas de la version finale."}
                </FormAlert>
                {result.resultat === 'diverge' && result.marquesInvisibles && (
                  <FormAlert tone="info">
                    {result.marquesInvisibles.memeDocument
                      ? `Les marques invisibles de SignSecure montrent qu'il s'agit bien d'une copie de ce document, mais modifiée après scellement${
                          result.marquesInvisibles.pagesSansMarque.length
                            ? ` (page${result.marquesInvisibles.pagesSansMarque.length > 1 ? 's' : ''} ${result.marquesInvisibles.pagesSansMarque.join(', ')} ajoutée(s) ou remplacée(s))`
                            : ''
                        }. Fiez-vous à l'original enregistré.`
                      : result.marquesInvisibles.autreDocument
                        ? "Ce fichier porte les marques d'un AUTRE document SignSecure : il ne correspond pas à ce code."
                        : result.marquesInvisibles.marquesFalsifiees > 0
                          ? 'Ce fichier contient de fausses marques SignSecure : il a été fabriqué ou falsifié.'
                          : "Ce fichier ne porte aucune marque SignSecure : ce n'est pas un document scellé par la plateforme, ou ses marques ont été effacées."}
                  </FormAlert>
                )}
                <div className="font-mono text-[11px] text-on-surface-variant break-all bg-surface p-3 rounded-lg border border-outline-variant/50">
                  <div>Votre fichier : {result.hashSoumis}</div>
                  <div>Référence : {result.hashReference}</div>
                </div>
              </div>
            )}

            <div
              className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative group min-h-[220px] ${
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
                aria-label="Téléverser un fichier PDF pour contrôle"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected) submitComparison(selected)
                }}
              />
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center text-primary mb-4">
                {comparing ? (
                  <span className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" aria-hidden="true" />
                ) : (
                  <Icon name="upload_file" size={28} />
                )}
              </div>
              <p className="font-headline-sm text-headline-sm text-on-surface mb-2">{comparing ? 'Calcul de l’empreinte…' : (file?.name ?? 'Glissez-déposez le PDF ici')}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">ou cliquez pour parcourir — PDF, 10 Mo max.</p>
            </div>
          </div>
        </div>
      )}
    </PublicVerifyShell>
  )
}
