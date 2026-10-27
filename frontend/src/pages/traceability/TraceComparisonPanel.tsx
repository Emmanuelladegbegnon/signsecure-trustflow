import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

export interface ReferencePhoto {
  id: string
  pageIndex: number
  sha256?: string | null
}

type Conclusion = 'CONCORDANCE_CONSTATEE' | 'DIVERGENCES_CONSTATEES' | 'EXAMEN_NON_CONCLUANT'

interface ComparisonEntry {
  id: string
  conclusion: Conclusion
  commentaire: string
  examinateur: string
  date: string
  sha256CopieExaminee: string
}

// Vocabulaire prudent : on consigne ce qu'une personne a constaté, jamais un verdict d'identité.
const CONCLUSIONS: Record<Conclusion, { label: string; icon: string; className: string }> = {
  CONCORDANCE_CONSTATEE: { label: "Concordance constatée à l'examen visuel", icon: 'task_alt', className: 'text-[#166534]' },
  DIVERGENCES_CONSTATEES: { label: 'Divergences constatées', icon: 'report', className: 'text-error' },
  EXAMEN_NON_CONCLUANT: { label: 'Examen non concluant', icon: 'help', className: 'text-on-surface-variant' },
}

/**
 * Examen de concordance (option A retenue) : un Vérificateur ou Superviseur
 * affiche côte à côte une photo de référence et la copie présentée, puis
 * consigne son constat. Aucun score ni comparaison automatique (CLAUDE.md §
 * Verify) ; le serveur horodate l'examen et inscrit au journal l'empreinte
 * de la copie examinée.
 */
export function TraceComparisonPanel({ documentId, photos, photoUrls }: { documentId: string; photos: ReferencePhoto[]; photoUrls: Record<string, string> }) {
  const { user } = useAuth()
  const canReview = user?.roles.some((r) => r === 'Vérificateur' || r === 'Superviseur') ?? false

  const [entries, setEntries] = useState<ComparisonEntry[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [copy, setCopy] = useState<File | null>(null)
  const [copyUrl, setCopyUrl] = useState<string | null>(null)
  const [conclusion, setConclusion] = useState<Conclusion | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = (signal?: AbortSignal) =>
    apiRequest<{ comparaisons: ComparisonEntry[] }>(`/trace/${documentId}/comparaisons`, { signal })
      .then((res) => setEntries(res.comparaisons))
      .catch((err) => {
        if (signal?.aborted) return
        setListError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les examens.')
      })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  useEffect(() => {
    if (!referenceId && photos.length > 0) setReferenceId(photos[0]!.id)
  }, [photos, referenceId])

  useEffect(() => {
    if (!copy) {
      setCopyUrl(null)
      return
    }
    const url = URL.createObjectURL(copy)
    setCopyUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [copy])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaved(false)
    if (!copy) return setFormError('Ajoutez la copie présentée (photo ou scan).')
    if (!conclusion) return setFormError('Choisissez votre constat.')
    if (!commentaire.trim()) return setFormError('Décrivez ce que vous avez comparé et constaté.')
    const form = new FormData()
    form.append('fichier', copy)
    form.append('conclusion', conclusion)
    form.append('commentaire', commentaire.trim())
    setSubmitting(true)
    try {
      await apiRequest(`/trace/${documentId}/comparaisons`, { method: 'POST', body: form })
      setSaved(true)
      setCopy(null)
      setConclusion(null)
      setCommentaire('')
      await load()
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const reference = photos.find((p) => p.id === referenceId)
  const copyIsImage = copy?.type.startsWith('image/') ?? false

  return (
    <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant mt-8">
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 flex items-center gap-2">
        <Icon name="compare" />
        Examen de concordance
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
        Comparez à l'œil une copie présentée aux photos prises à la réception, puis consignez votre constat. Aucune comparaison automatique
        n'est faite sur une photo : seul votre examen est enregistré, avec l'empreinte de la copie examinée.
      </p>

      {canReview && photos.length > 0 && (
        <form className="flex flex-col gap-4 mb-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="reference-page">
                Photo de référence
              </label>
              <select
                id="reference-page"
                className="border border-outline-variant rounded-lg px-3 py-2 bg-surface font-body-sm text-body-sm"
                value={referenceId ?? ''}
                onChange={(e) => setReferenceId(e.target.value)}
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    Page {p.pageIndex + 1}
                  </option>
                ))}
              </select>
              <div className="aspect-[3/4] rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden flex items-center justify-center">
                {reference && photoUrls[reference.id] ? (
                  <img src={photoUrls[reference.id]} alt={`Référence page ${reference.pageIndex + 1}`} className="w-full h-full object-contain" />
                ) : (
                  <Icon name="image" className="text-on-surface-variant" />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="copie-presentee">
                Copie présentée
              </label>
              <input
                id="copie-presentee"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="font-body-sm text-body-sm"
                onChange={(e) => setCopy(e.target.files?.[0] ?? null)}
              />
              <div className="aspect-[3/4] rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden flex items-center justify-center">
                {copyUrl && copyIsImage && <img src={copyUrl} alt="Copie présentée" className="w-full h-full object-contain" />}
                {copyUrl && !copyIsImage && <iframe src={copyUrl} title="Copie présentée" className="w-full h-full" />}
                {!copyUrl && <Icon name="upload_file" className="text-on-surface-variant" />}
              </div>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-label-md text-label-md text-on-surface mb-1">Votre constat</legend>
            {(Object.keys(CONCLUSIONS) as Conclusion[]).map((key) => (
              <label key={key} className="flex items-center gap-2 font-body-sm text-body-sm cursor-pointer">
                <input type="radio" name="conclusion" checked={conclusion === key} onChange={() => setConclusion(key)} />
                <Icon name={CONCLUSIONS[key].icon} size={18} className={CONCLUSIONS[key].className} />
                {CONCLUSIONS[key].label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="commentaire-examen">
              Observations *
            </label>
            <textarea
              id="commentaire-examen"
              rows={3}
              className="border border-outline-variant rounded-lg p-3 bg-surface font-body-sm text-body-sm resize-none"
              placeholder="Ex : pages 1 à 3 comparées ; texte, cachet et paraphes visibles aux mêmes emplacements."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>

          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          {saved && <FormAlert tone="success">Examen enregistré et inscrit au journal d'audit.</FormAlert>}
          <button
            type="submit"
            disabled={submitting}
            className="self-start bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md text-label-md disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
            Enregistrer l'examen
          </button>
        </form>
      )}
      {!canReview && (
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Seuls les rôles Vérificateur et Superviseur peuvent enregistrer un examen.</p>
      )}

      {listError && <FormAlert tone="error">{listError}</FormAlert>}
      {entries.length === 0 && !listError && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun examen enregistré pour ce dossier.</p>}
      {entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="border border-outline-variant rounded-lg p-4">
              <div className={`font-label-md text-label-md flex items-center gap-2 ${CONCLUSIONS[entry.conclusion].className}`}>
                <Icon name={CONCLUSIONS[entry.conclusion].icon} size={18} />
                {CONCLUSIONS[entry.conclusion].label}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface mt-1">{entry.commentaire}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
                {entry.examinateur} — {new Date(entry.date).toLocaleString('fr-FR')} — empreinte de la copie : {entry.sha256CopieExaminee.slice(0, 16)}…
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
