import { useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'

interface SignerZone {
  page: number
  x: number
  y: number
}

interface Signer {
  nom: string
  email: string
  telephone: string
  zone: SignerZone
}

const DEFAULT_ZONE: SignerZone = { page: 1, x: 70, y: 80 }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AssignSigners() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [signers, setSigners] = useState<Signer[]>([])
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [pendingZone, setPendingZone] = useState<SignerZone | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [invitesSent, setInvitesSent] = useState(false)

  const placeZone = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setPendingZone({ page: 1, x, y })
  }

  const addSigner = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!nom.trim()) return setFormError('Le nom complet est requis.')
    if (!EMAIL_PATTERN.test(email.trim())) return setFormError('Adresse e-mail invalide.')
    if (!telephone.trim()) return setFormError('Le numéro de téléphone est requis (pour l’OTP de signature).')

    setSigners((prev) => [...prev, { nom: nom.trim(), email: email.trim(), telephone: telephone.trim(), zone: pendingZone ?? DEFAULT_ZONE }])
    setNom('')
    setEmail('')
    setTelephone('')
    setPendingZone(null)
  }

  const removeSigner = (index: number) => setSigners((prev) => prev.filter((_, i) => i !== index))

  const handleSend = async () => {
    if (!id || signers.length === 0 || sending) return
    setSendError(null)
    setSending(true)
    try {
      await apiRequest(`/documents/${id}/signataires`, { method: 'POST', body: { signataires: signers } })
      await apiRequest(`/documents/${id}/envoyer`, { method: 'POST' })
      setInvitesSent(true)
    } catch (err) {
      setSendError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  if (invitesSent) {
    return (
      <AppShell active="sign">
        <div className="max-w-lg mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-6">
            <Icon name="mark_email_read" filled className="text-primary" size={32} />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Invitations envoyées</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-sm">
            Chaque signataire va recevoir un email avec un lien de signature personnel, à usage unique, valable 48h. Le
            document apparaîtra comme « En attente » dans vos dossiers jusqu'à la signature de toutes les parties.
          </p>
          <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-8 text-left flex flex-col gap-2">
            {signers.map((signer, i) => (
              <div key={`${signer.email}-${i}`} className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                <Icon name="mail" size={16} />
                {signer.nom} — {signer.email}
              </div>
            ))}
          </div>
          <div className="w-full flex flex-col gap-3">
            <button
              className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity"
              onClick={() => navigate(ROUTES.myFolders)}
            >
              Voir mes dossiers
            </button>
            <button className="font-label-sm text-label-sm text-primary hover:underline" onClick={() => navigate(ROUTES.dashboard)}>
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell active="sign" bleed>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-surface-container-lowest min-h-0">
        {/* PDF Viewer */}
        <section className="flex-[2] bg-surface-container-low flex flex-col border-r border-outline-variant relative overflow-hidden">
          <div className="h-12 border-b border-outline-variant bg-surface flex items-center justify-between px-4 shrink-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Document du dossier</span>
            <div className="flex items-center gap-3">
              <span className="font-body-sm text-body-sm text-on-surface-variant">100%</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-surface-container">
            <div
              className="w-full max-w-[800px] h-fit min-h-[1100px] bg-white shadow-sm border border-outline-variant p-10 md:p-16 relative cursor-crosshair"
              onClick={placeZone}
              title="Cliquez pour positionner la zone de signature du prochain signataire"
            >
              <div className="w-1/3 h-8 bg-surface-container-high mb-8 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-5/6 h-4 bg-surface-container mb-12 rounded" />
              <div className="w-1/4 h-6 bg-surface-container-high mb-6 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-4/5 h-4 bg-surface-container mb-12 rounded" />

              {pendingZone && (
                <div
                  className="absolute w-40 h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary bg-primary-container/10 flex items-center justify-center rounded pointer-events-none"
                  style={{ left: `${pendingZone.x}%`, top: `${pendingZone.y}%` }}
                >
                  <span className="font-label-sm text-label-sm text-primary">Prochain signataire</span>
                </div>
              )}
              {signers.map((signer, i) => (
                <div
                  key={`${signer.email}-${i}`}
                  className="absolute w-40 h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-outline-variant bg-surface flex items-center justify-center rounded pointer-events-none"
                  style={{ left: `${signer.zone.x}%`, top: `${signer.zone.y}%` }}
                >
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate px-2">{signer.nom}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Signers Panel */}
        <section className="flex-[1] bg-surface-container-lowest flex flex-col min-w-[320px] lg:max-w-md">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Ajouter des signataires</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cliquez sur le document pour positionner une zone de signature, puis renseignez les informations du signataire.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {sendError && <FormAlert tone="error">{sendError}</FormAlert>}

            {signers.map((signer, i) => (
              <div key={`${signer.email}-${i}`} className="bg-surface border border-outline-variant rounded-xl p-4 relative group">
                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-[10px] font-bold border-2 border-surface-container-lowest shadow-sm">
                  {i + 1}
                </div>
                <div className="flex justify-between items-start mb-3 ml-2">
                  <h3 className="font-label-md text-label-md font-semibold text-on-surface">{signer.nom}</h3>
                  <button className="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full" onClick={() => removeSigner(i)} type="button">
                    <Icon name="close" size={20} />
                  </button>
                </div>
                <div className="ml-2 flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="mail" size={16} />
                  {signer.email}
                </div>
                <div className="ml-2 flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="phone" size={16} />
                  {signer.telephone}
                </div>
              </div>
            ))}

            <form className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative" onSubmit={addSigner}>
              <div className="absolute -left-2.5 top-5 w-5 h-5 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-label-sm text-[10px] font-bold border-2 border-surface-container-lowest">
                {signers.length + 1}
              </div>
              <div className="ml-2 space-y-4">
                {formError && <FormAlert tone="error">{formError}</FormAlert>}

                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="nom">
                    Nom complet *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="nom"
                    placeholder="Saisir le nom"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="email">
                    Email *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="email"
                    placeholder="contact@exemple.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="telephone">
                    Téléphone *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="telephone"
                    placeholder="+229 97 00 00 00"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Requis pour l'OTP exigé avant validation de la signature.</p>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="location_on" size={14} />
                  {pendingZone ? `Zone positionnée (${pendingZone.x}%, ${pendingZone.y}%)` : 'Zone par défaut — cliquez sur le document pour la personnaliser.'}
                </p>
                <button
                  className="w-full border border-dashed border-outline text-secondary hover:text-primary hover:border-primary hover:bg-primary-container/5 transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-label-md text-label-md"
                  type="submit"
                >
                  <Icon name="person_add" />
                  Ajouter ce signataire
                </button>
              </div>
            </form>
          </div>
          <div className="p-6 border-t border-outline-variant bg-surface-container-lowest mt-auto">
            <button
              className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-label-md text-label-md font-bold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSend}
              disabled={signers.length === 0 || sending}
              type="button"
            >
              {sending ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
              ) : (
                <Icon name="send" />
              )}
              {sending ? 'Envoi…' : 'Envoyer pour signature'}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
