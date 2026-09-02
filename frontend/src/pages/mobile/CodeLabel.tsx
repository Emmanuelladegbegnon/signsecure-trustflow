import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function CodeLabel() {
  const navigate = useNavigate()

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center pt-8 pb-32 px-margin-mobile">
      <header className="w-full max-w-[400px] mb-8 text-center flex flex-col items-center">
        <div className="h-16 w-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Icon name="check_circle" filled size={30} />
        </div>
        <h1 className="font-headline-md text-headline-md text-primary">Document Sécurisé</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-center">Générez et apposez l'étiquette de sécurité sur le document physique.</p>
      </header>

      <main className="w-full max-w-[400px] flex flex-col gap-6">
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col items-center relative overflow-hidden">
          <h2 className="font-label-md text-label-md text-on-surface-variant w-full text-left mb-4 uppercase">Aperçu de l'étiquette</h2>
          <div className="bg-surface-bright border-2 border-dashed border-outline-variant rounded-lg p-6 w-full flex flex-col items-center gap-4 relative z-10 shadow-sm">
            <div className="bg-white p-3 rounded shadow-sm border border-surface-variant text-on-surface-variant">
              <Icon name="qr_code_2" size={128} />
            </div>
            <div className="text-center w-full">
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Code de suivi</div>
              <div className="font-headline-sm text-headline-sm tracking-[0.2em] font-bold text-on-surface bg-surface-container py-2 px-4 rounded">STF-982-4A</div>
            </div>
            <div className="mt-2 flex items-center gap-2 bg-error-container text-on-error-container px-3 py-1.5 rounded-full w-full justify-center">
              <Icon name="warning" size={16} />
              <span className="font-label-sm text-label-sm">SignSecure — Ne pas coller sur la signature</span>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex items-start gap-4">
          <Icon name="info" className="text-primary mt-1" />
          <div>
            <h3 className="font-label-md text-label-md text-on-surface">Instructions d'impression</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Assurez-vous que votre imprimante d'étiquettes thermique est connectée. Format recommandé : 50x30mm.
            </p>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant p-4 flex flex-col gap-3 shadow-lg z-50">
        <button className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md h-12 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
          <Icon name="print" />
          Imprimer la fiche
        </button>
        <button
          className="w-full border border-outline hover:bg-surface-container text-on-surface font-label-md text-label-md h-12 rounded-lg flex items-center justify-center transition-colors active:scale-[0.98]"
          onClick={() => navigate(ROUTES.mobileObservations)}
        >
          Terminer
        </button>
      </footer>
    </div>
  )
}
