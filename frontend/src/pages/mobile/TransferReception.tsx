import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function TransferReception() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-margin-mobile md:p-margin-desktop bg-surface">
      <main className="w-full max-w-[400px] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 flex flex-col relative overflow-hidden">
        <div className="h-2 w-full bg-primary" />
        <div className="p-6 flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center relative">
              <Icon name="file_download" filled size={32} className="text-on-primary-container" />
            </div>
          </div>

          <h1 className="font-headline-sm text-headline-sm text-on-surface mb-2">Un document vous a été transféré</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8">Veuillez confirmer la réception de ce document pour poursuivre le processus.</p>

          <div className="w-full bg-surface rounded-lg border border-outline-variant p-4 mb-8 text-left">
            <div className="flex items-start mb-4">
              <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center mr-3 shrink-0">
                <Icon name="description" className="text-on-secondary-container" />
              </div>
              <div>
                <h2 className="font-label-md text-label-md text-on-surface mb-1">Contrat de Prestation.pdf</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">2.4 MB • Réf: XA-4892</p>
              </div>
            </div>
            <div className="h-px w-full bg-outline-variant/50 mb-4" />
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mr-2 font-label-sm text-label-sm font-bold shrink-0">
                  JD
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface">Transféré par</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Jean Dupont</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-label-sm text-label-sm text-on-surface">Date</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">14 Nov 2023</p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-4">
            <button
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-sm"
              onClick={() => navigate(ROUTES.traceabilityList)}
            >
              <Icon name="check_circle" size={20} className="mr-2" />
              Confirmer la réception
            </button>
            <button
              className="w-full bg-transparent hover:bg-surface-variant/50 text-secondary font-label-md text-label-md py-3 px-6 rounded-full border border-outline-variant transition-colors flex items-center justify-center"
              onClick={() => navigate(ROUTES.mobileIncident)}
            >
              Signaler un problème
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
