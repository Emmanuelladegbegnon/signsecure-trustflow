import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicShell } from '../../components/layout/PublicShell'
import { Icon } from '../../components/ui/Icon'
import { OtpInputGroup } from '../../components/ui/OtpInputGroup'
import { ROUTES } from '../../routes'

export function SignatureOtp() {
  const navigate = useNavigate()
  const [complete, setComplete] = useState(false)

  return (
    <PublicShell withHeader headerAction={<button className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-all">Aide</button>}>
      <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant w-full max-w-[480px] p-gutter flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="mx-auto w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-2">
            <Icon name="dialpad" filled size={28} className="text-primary" />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Vérification de sécurité</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Confirmez votre signature avec le code envoyé au <strong className="text-on-surface font-semibold">+229 ••• ••• 45</strong>
          </p>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center gap-4">
          <div className="bg-surface-container-lowest p-2 rounded-md shadow-sm border border-surface-variant shrink-0">
            <Icon name="description" filled className="text-secondary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Document à signer</span>
            <span className="font-body-md text-body-md font-medium text-on-surface truncate">Contrat de maintenance</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Signataire: Awa KONE</span>
          </div>
        </div>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (complete) navigate(ROUTES.signatureSuccess)
          }}
        >
          <OtpInputGroup length={6} onChange={(_, isComplete) => setComplete(isComplete)} />
          <div className="text-center mt-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Code non reçu ?{' '}
              <button className="text-primary font-medium hover:underline focus:outline-none" type="button">
                Renvoyer le code
              </button>
            </p>
          </div>
          <button
            className={`w-full font-label-md text-label-md py-4 px-6 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2 ${
              complete ? 'bg-primary hover:bg-on-primary-fixed-variant text-on-primary' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
            }`}
            disabled={!complete}
            type="submit"
          >
            <Icon name="check_circle" size={20} />
            Valider la signature
          </button>
        </form>
      </div>
    </PublicShell>
  )
}
