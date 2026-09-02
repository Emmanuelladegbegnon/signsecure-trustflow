import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

interface TransferResponse {
  transfertId: string
  statut: string
}

export function TransferRequest() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [destinataireId, setDestinataireId] = useState('')
  const [lieu, setLieu] = useState('')
  const [motif, setMotif] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setApiError(null)
    if (!id) return
    if (!destinataireId.trim()) {
      setFieldError('Indiquez le destinataire du transfert.')
      return
    }

    setSubmitting(true)
    try {
      await apiRequest<TransferResponse>(`/trace/${id}/transfert`, {
        method: 'POST',
        body: { destinataireId: destinataireId.trim(), lieu: lieu.trim() || undefined, motif: motif.trim() || undefined },
      })
      navigate(ROUTES.traceabilityList)
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      <header className="bg-surface-container-lowest shadow-[0px_1px_3px_rgba(15,23,42,0.1)] flex items-center h-16 px-margin-mobile sticky top-0 z-40">
        <button
          aria-label="Retour"
          className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          onClick={() => navigate(-1)}
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="ml-2 font-headline-sm text-headline-sm text-on-surface">Demande de transfert</h1>
      </header>

      <main className="flex-1 flex flex-col px-margin-mobile py-gutter w-full max-w-[600px] mx-auto gap-9">
        <section>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex items-center gap-4">
            <div className="bg-surface-container-high p-3 rounded-lg text-primary shrink-0">
              <Icon name="folder" filled size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Dossier</span>
              <h3 className="font-label-md text-label-md text-on-surface truncate">{id}</h3>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">Détails du transfert</h2>

          {(fieldError || apiError) && (
            <div className="mb-6">
              <FormAlert tone="error">{fieldError ?? apiError}</FormAlert>
            </div>
          )}

          <form className="flex flex-col gap-6 flex-1" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="destinataire">
                Identifiant du destinataire *
              </label>
              <div className="relative">
                <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  className="block w-full pl-10 pr-3 py-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-shadow placeholder:text-on-surface-variant/60"
                  id="destinataire"
                  name="destinataire"
                  placeholder="Identifiant du compte destinataire"
                  type="text"
                  value={destinataireId}
                  onChange={(e) => setDestinataireId(e.target.value)}
                />
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                Fourni par votre administrateur — aucun annuaire de recherche n'est encore disponible pour ce champ.
              </p>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="lieu">
                Lieu physique cible
              </label>
              <div className="relative">
                <Icon name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  className="block w-full pl-10 pr-3 py-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-shadow placeholder:text-on-surface-variant/60"
                  id="lieu"
                  name="lieu"
                  placeholder="Ex: Bureau 402, Bâtiment A"
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="motif">
                Motif du transfert
              </label>
              <textarea
                className="block w-full p-3 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-shadow resize-none placeholder:text-on-surface-variant/60"
                id="motif"
                name="motif"
                placeholder="Veuillez préciser la raison légale ou opérationnelle de ce transfert..."
                rows={4}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            </div>

            <div className="mt-auto pt-8 pb-4">
              <button
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                ) : (
                  <Icon name="send" size={20} />
                )}
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </button>
              <button className="w-full mt-4 text-primary font-label-md text-label-md py-3 rounded-full hover:bg-surface-container-high transition-colors" type="button" onClick={() => navigate(-1)}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
