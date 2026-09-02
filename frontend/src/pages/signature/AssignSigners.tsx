import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

interface Signer {
  role: string
  name: string
  contact: string
  requireOtp: boolean
}

export function AssignSigners() {
  const navigate = useNavigate()
  const [signers, setSigners] = useState<Signer[]>([{ role: 'Directeur Général', name: 'Jean Dupont', contact: 'jean.d@entreprise.com', requireOtp: true }])
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [requireOtp, setRequireOtp] = useState(false)
  const [invitesSent, setInvitesSent] = useState(false)

  const addSigner = (e: FormEvent) => {
    e.preventDefault()
    if (!role || !name || !contact) return
    setSigners((prev) => [...prev, { role, name, contact, requireOtp }])
    setRole('')
    setName('')
    setContact('')
    setRequireOtp(false)
  }

  const removeSigner = (index: number) => setSigners((prev) => prev.filter((_, i) => i !== index))

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
              <div key={`${signer.name}-${i}`} className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                <Icon name="mail" size={16} />
                {signer.name} — {signer.contact}
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
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Contrat_Pret_Bancaire_v2.pdf</span>
            <div className="flex items-center gap-3">
              <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors" title="Zoom Arrière" type="button">
                <Icon name="zoom_out" size={20} />
              </button>
              <span className="font-body-sm text-body-sm text-on-surface-variant">100%</span>
              <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors" title="Zoom Avant" type="button">
                <Icon name="zoom_in" size={20} />
              </button>
              <div className="w-px h-6 bg-outline-variant mx-1" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">Page 1 / 12</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-surface-container">
            <div className="w-full max-w-[800px] h-fit min-h-[1100px] bg-white shadow-sm border border-outline-variant p-10 md:p-16 relative">
              <div className="w-1/3 h-8 bg-surface-container-high mb-8 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-5/6 h-4 bg-surface-container mb-12 rounded" />
              <div className="w-1/4 h-6 bg-surface-container-high mb-6 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-full h-4 bg-surface-container mb-4 rounded" />
              <div className="w-4/5 h-4 bg-surface-container mb-12 rounded" />
              <div className="absolute bottom-32 left-16 w-64 h-32 border-2 border-dashed border-primary bg-primary-container/5 flex items-center justify-center rounded group hover:bg-primary-container/10 transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Icon name="signature" />
                  <span className="font-label-sm text-label-sm">Zone de signature : Directeur</span>
                </div>
              </div>
              <div className="absolute bottom-8 right-8">
                <button className="bg-surface-container-lowest border border-primary text-primary shadow-lg rounded-full px-4 py-3 flex items-center gap-2 hover:bg-primary hover:text-on-primary transition-all font-label-md text-label-md font-bold">
                  <Icon name="place_item" />
                  Placer la signature
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Signers Panel */}
        <section className="flex-[1] bg-surface-container-lowest flex flex-col min-w-[320px] lg:max-w-md">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Ajouter des signataires</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Définissez l'ordre et les informations des personnes devant signer ce document.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {signers.map((signer, i) => (
              <div key={`${signer.name}-${i}`} className="bg-surface border border-outline-variant rounded-xl p-4 relative group">
                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-[10px] font-bold border-2 border-surface-container-lowest shadow-sm">
                  {i + 1}
                </div>
                <div className="flex justify-between items-start mb-3 ml-2">
                  <div>
                    <h3 className="font-label-md text-label-md font-semibold text-on-surface">{signer.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{signer.role}</p>
                  </div>
                  <button className="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full" onClick={() => removeSigner(i)} type="button">
                    <Icon name="close" size={20} />
                  </button>
                </div>
                <div className="ml-2 flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="mail" size={16} />
                  {signer.contact}
                </div>
              </div>
            ))}

            <form className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative" onSubmit={addSigner}>
              <div className="absolute -left-2.5 top-5 w-5 h-5 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-label-sm text-[10px] font-bold border-2 border-surface-container-lowest">
                {signers.length + 1}
              </div>
              <div className="ml-2 space-y-4">
                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="role">
                    Rôle / Fonction *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="role"
                    placeholder="Ex: Directeur Financier"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="nom">
                    Nom complet *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="nom"
                    placeholder="Saisir le nom"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="contact">
                    Email ou Mobile *
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    id="contact"
                    placeholder="contact@exemple.com"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      className="w-4 h-4 rounded border-outline text-primary focus:ring-primary bg-surface-container-lowest cursor-pointer"
                      type="checkbox"
                      checked={requireOtp}
                      onChange={(e) => setRequireOtp(e.target.checked)}
                    />
                    <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">
                      Exiger OTP par SMS (Sécurité Renforcée)
                    </span>
                  </label>
                </div>
                <button
                  className="w-full border border-dashed border-outline text-secondary hover:text-primary hover:border-primary hover:bg-primary-container/5 transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-label-md text-label-md"
                  type="submit"
                >
                  <Icon name="person_add" />
                  Ajouter un autre signataire
                </button>
              </div>
            </form>
          </div>
          <div className="p-6 border-t border-outline-variant bg-surface-container-lowest mt-auto">
            <button
              className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-label-md text-label-md font-bold shadow-sm"
              onClick={() => setInvitesSent(true)}
              type="button"
            >
              <Icon name="send" />
              Envoyer pour signature
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
