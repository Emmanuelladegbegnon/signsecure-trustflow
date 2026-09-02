import { useState } from 'react'
import { PublicShell } from '../../components/layout/PublicShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { OtpInputGroup } from '../../components/ui/OtpInputGroup'

interface SignatureOtpProps {
  documentTitle: string
  onSubmit: (code: string) => Promise<void>
  submitting: boolean
  error: string | null
}

/**
 * Second facteur exigé juste avant la validation finale de la signature
 * (CLAUDE.md § Sign — distinct de toute connexion précédente). Le contrat
 * API n'expose pas de endpoint de renvoi pour ce code : pas de bouton
 * "renvoyer" fabriqué côté client tant qu'il n'existe pas côté back.
 */
export function SignatureOtp({ documentTitle, onSubmit, submitting, error }: SignatureOtpProps) {
  const [code, setCode] = useState('')
  const [complete, setComplete] = useState(false)

  return (
    <PublicShell withHeader headerAction={<button className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-all">Aide</button>}>
      <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant w-full max-w-[480px] p-gutter flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="mx-auto w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-2">
            <Icon name="dialpad" filled size={28} className="text-primary" />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Vérification de sécurité</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Un code de vérification vous a été envoyé pour confirmer votre signature.</p>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center gap-4">
          <div className="bg-surface-container-lowest p-2 rounded-md shadow-sm border border-surface-variant shrink-0">
            <Icon name="description" filled className="text-secondary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Document à signer</span>
            <span className="font-body-md text-body-md font-medium text-on-surface truncate">{documentTitle}</span>
          </div>
        </div>

        {error && <FormAlert tone="error">{error}</FormAlert>}

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (complete && !submitting) onSubmit(code)
          }}
        >
          <OtpInputGroup length={6} onChange={(value, isComplete) => {
            setCode(value)
            setComplete(isComplete)
          }} />
          <button
            className={`w-full font-label-md text-label-md py-4 px-6 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2 ${
              complete && !submitting ? 'bg-primary hover:bg-on-primary-fixed-variant text-on-primary' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
            }`}
            disabled={!complete || submitting}
            type="submit"
          >
            {submitting ? (
              <span className="w-4 h-4 rounded-full border-2 border-on-surface-variant/40 border-t-on-surface-variant animate-spin" aria-hidden="true" />
            ) : (
              <Icon name="check_circle" size={20} />
            )}
            {submitting ? 'Vérification…' : 'Valider la signature'}
          </button>
        </form>
      </div>
    </PublicShell>
  )
}
