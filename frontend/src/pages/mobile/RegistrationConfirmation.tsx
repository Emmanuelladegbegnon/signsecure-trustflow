import { Icon } from '../../components/ui/Icon'

interface RegistrationConfirmationProps {
  trackingCode: string
  onDone: () => void
}

/** Écran final, une fois l'étiquette imprimée — rendu par Observations.tsx. */
export function RegistrationConfirmation({ trackingCode, onDone }: RegistrationConfirmationProps) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
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
            Le document a été enregistré avec les contrôles effectués et le code de suivi ci-dessous.
          </p>
        </div>

        <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-outline-variant p-5 mb-8 animate-entrance text-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Code de suivi</span>
          <span className="font-headline-md text-headline-md font-mono text-primary tracking-wider">{trackingCode}</span>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-margin-mobile bg-surface/90 backdrop-blur-md border-t border-outline-variant shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <button className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm" onClick={onDone}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
