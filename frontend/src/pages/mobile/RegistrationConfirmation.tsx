import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function RegistrationConfirmation() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText('8f4e9b2c1a4d3d7e5f6g8h')
    } catch {
      /* clipboard unavailable — ignore, this is a non-critical convenience action */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-background text-on-background h-screen flex flex-col font-body-md overflow-x-hidden">
      <header className="w-full h-16 flex items-center px-margin-mobile bg-white shadow-sm z-40">
        <h1 className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-margin-mobile py-8 pb-32 flex flex-col items-center justify-start">
        <div className="mb-8 flex flex-col items-center animate-entrance">
          <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-4">
            <Icon name="check_circle" filled size={36} className="text-on-primary-container" />
          </div>
          <h2 className="font-headline-lg text-headline-lg text-center text-on-surface mb-2">Enregistrement Confirmé</h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-[280px]">
            Votre document a été sécurisé et enregistré avec succès dans le registre immuable.
          </p>
        </div>

        <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-outline-variant p-5 mb-8 animate-entrance">
          <div className="flex items-start justify-between border-b border-outline-variant pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center">
                <Icon name="description" className="text-primary" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Contrat_Prestation_v2.pdf</h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">2.4 MB • PDF</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Identifiant Unique (Hash)</span>
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded p-2">
                <span className="font-body-sm text-body-sm text-on-surface truncate font-mono">8f4e9b2c1a...3d7e5f6g8h</span>
                <button aria-label="Copier le hash" className="text-primary hover:bg-surface-container p-1 rounded transition-colors" onClick={copyHash}>
                  <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Date d'Enregistrement</span>
                <span className="font-body-md text-body-md text-on-surface">24 Oct 2023</span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Heure (UTC)</span>
                <span className="font-body-md text-body-md text-on-surface">14:32:45</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Statut:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm">
                <Icon name="verified" size={14} className="mr-1" />
                Scellé &amp; Valide
              </span>
            </div>
          </div>
          <div className="mt-5 w-full h-32 rounded-lg overflow-hidden border border-outline-variant relative bg-surface-container-low flex items-center justify-center text-on-surface-variant/60">
            <Icon name="description" size={40} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-margin-mobile bg-surface/90 backdrop-blur-md border-t border-outline-variant shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <button className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
          <Icon name="qr_code" />
          Générer le code de suivi
        </button>
        <button
          className="w-full mt-3 h-10 text-primary font-label-md text-label-md rounded flex items-center justify-center hover:bg-surface-container-high transition-colors"
          onClick={() => navigate(ROUTES.traceabilityList)}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
