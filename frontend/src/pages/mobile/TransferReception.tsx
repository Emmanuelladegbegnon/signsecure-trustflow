import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

// API_CONTRACT.md n'expose aucun GET pour récupérer les détails d'un
// transfert (émetteur, document, date) avant confirmation — seul l'appel de
// confirmation est réel ici ; le panneau "document transféré" ne peut pas
// être rempli avec de vraies données tant que cet endpoint n'existe pas.
export function TransferReception() {
  const navigate = useNavigate()
  const { transfertId } = useParams<{ transfertId: string }>()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = async () => {
    if (!transfertId || confirming) return
    setError(null)
    setConfirming(true)
    try {
      await apiRequest(`/trace/transfert/${transfertId}/confirmer`, { method: 'POST' })
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-margin-mobile md:p-margin-desktop bg-surface">
      <main className="w-full max-w-[400px] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 flex flex-col relative overflow-hidden">
        <div className="h-2 w-full bg-primary" />
        <div className="p-6 flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            {!confirmed && <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />}
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center relative">
              <Icon name={confirmed ? 'check_circle' : 'file_download'} filled size={32} className="text-on-primary-container" />
            </div>
          </div>

          {confirmed ? (
            <>
              <h1 className="font-headline-sm text-headline-sm text-on-surface mb-2">Réception confirmée</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-8">Le détenteur actuel de ce dossier a été mis à jour.</p>
              <button
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-3 px-6 rounded-full transition-colors"
                onClick={() => navigate(ROUTES.traceabilityList)}
              >
                Retour à l'accueil
              </button>
            </>
          ) : (
            <>
              <h1 className="font-headline-sm text-headline-sm text-on-surface mb-2">Un document vous a été transféré</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-8">Veuillez confirmer la réception de ce document pour poursuivre le processus.</p>

              {error && (
                <div className="w-full mb-6">
                  <FormAlert tone="error">{error}</FormAlert>
                </div>
              )}

              <div className="w-full bg-surface rounded-lg border border-outline-variant p-4 mb-8 text-left">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Icon name="tag" size={16} />
                  <span className="font-body-sm text-body-sm">Transfert : {transfertId}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-4">
                <button
                  className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon name="check_circle" size={20} className="mr-2" />
                  )}
                  {confirming ? 'Confirmation…' : 'Confirmer la réception'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
