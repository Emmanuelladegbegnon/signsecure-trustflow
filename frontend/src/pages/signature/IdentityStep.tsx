import { useState, type FormEvent } from 'react'
import { PublicShell } from '../../components/layout/PublicShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { IDENTITY_DOC_TYPES } from '../../constants/identityDocTypes'


interface IdentityStepProps {
  token: string
  documentTitle: string
  statut: 'A_FOURNIR' | 'EN_ATTENTE' | 'REFUSEE'
  motifRefus: string | null
  onSubmitted: () => void
}

/**
 * Étape « pièce d'identité » du signataire, quand le dossier l'exige. La pièce
 * est contrôlée par une personne de l'organisation (pas de reconnaissance
 * faciale) ; la photo est supprimée dès la décision.
 */
export function IdentityStep({ token, documentTitle, statut, motifRefus, onSubmitted }: IdentityStepProps) {
  const [typePiece, setTypePiece] = useState<string>('CNI')
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!recto) return setError('Ajoutez une photo du recto de votre pièce.')
    setError(null)
    setSubmitting(true)
    const form = new FormData()
    form.append('typePiece', typePiece)
    form.append('recto', recto)
    if (verso) form.append('verso', verso)
    try {
      await apiRequest(`/sign/link/${token}/identite`, { method: 'POST', body: form, auth: false })
      onSubmitted()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Envoi impossible. Réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  if (statut === 'EN_ATTENTE') {
    return (
      <PublicShell withHeader>
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-container/10 flex items-center justify-center">
            <Icon name="hourglass_top" className="text-primary" size={28} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Pièce en cours de contrôle</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Votre pièce d'identité pour « {documentTitle} » a bien été reçue. Une personne de l'organisation émettrice la contrôle. Vous
            recevrez un email dès que vous pourrez signer, avec ce même lien.
          </p>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell withHeader>
      <form onSubmit={submit} className="w-full max-w-[520px] bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant p-6 md:p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="badge" className="text-primary" />
            <h1 className="font-headline-md text-headline-md text-on-surface">Votre pièce d'identité</h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Pour « {documentTitle} », l'organisation émettrice demande de contrôler votre identité avant la signature.
          </p>
        </div>

        {statut === 'REFUSEE' && (
          <FormAlert tone="error">
            Votre pièce précédente n'a pas été acceptée{motifRefus ? ` : ${motifRefus}` : '.'} Vous pouvez en envoyer une nouvelle.
          </FormAlert>
        )}
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="type-piece">
            Type de pièce
          </label>
          <select id="type-piece" className="border border-outline-variant rounded-lg px-3 py-2 bg-surface" value={typePiece} onChange={(e) => setTypePiece(e.target.value)}>
            {IDENTITY_DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {(
          [
            { id: 'recto', label: 'Photo du recto *', file: recto, set: setRecto },
            { id: 'verso', label: 'Photo du verso (si la pièce en a un)', file: verso, set: setVerso },
          ] as const
        ).map((f) => (
          <div key={f.id} className="flex flex-col gap-1">
            <label className="font-label-md text-label-md text-on-surface" htmlFor={`piece-${f.id}`}>
              {f.label}
            </label>
            <input
              id={`piece-${f.id}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="font-body-sm text-body-sm"
              onChange={(e) => f.set(e.target.files?.[0] ?? null)}
            />
            {f.file && <span className="font-label-sm text-label-sm text-on-surface-variant">{f.file.name}</span>}
          </div>
        ))}

        <div className="bg-surface-container-low rounded-lg p-4 font-body-sm text-body-sm text-on-surface-variant flex gap-2">
          <Icon name="lock" size={18} className="text-primary shrink-0 mt-0.5" />
          <span>
            Photographiez la pièce entière, lisible et sans reflet. La photo est chiffrée, vue seulement par la personne qui contrôle, puis
            <strong> supprimée dès la décision</strong> (ou après 7 jours sans décision). Aucune reconnaissance faciale n'est utilisée.
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
          Envoyer ma pièce
        </button>
      </form>
    </PublicShell>
  )
}
