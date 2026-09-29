import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { OFFICIAL_VERIFY_HOST } from '../../constants/officialDomain'
import { ROUTES, verifyResultUrl } from '../../routes'

export function PublicVerification() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)

  const trimmed = code.trim()
  const invalid = touched && !trimmed

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!trimmed) return
    // Le résultat (code inconnu, signé, révoqué, enregistré via Trace) vient
    // entièrement de GET /api/verify/:code, appelé par la page de résultat.
    navigate(verifyResultUrl(trimmed.toUpperCase()))
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center font-body-md">
      <div className="w-full max-w-md px-gutter flex flex-col items-center">
        <div className="mb-12 flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-container rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <Icon name="verified_user" className="text-on-primary-container" size={32} />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary text-center">SignSecure TrustFlow</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-center">Vérification de documents sécurisée</p>
        </div>

        <div className="bg-surface-container-lowest w-full rounded-2xl shadow-[0px_10px_15px_-3px_rgba(15,23,42,0.1)] border border-outline-variant/30 p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-fixed-dim" />
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <label className="font-label-md text-label-md text-on-surface" htmlFor="tracking-code">
              Code de suivi du document
            </label>
            <div className="relative">
              <input
                autoComplete="off"
                className={`w-full h-14 pl-4 pr-12 rounded-xl border bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-body-md text-on-surface placeholder:text-outline outline-none ${
                  invalid ? 'border-error' : 'border-outline-variant'
                }`}
                id="tracking-code"
                placeholder="Ex : SGN-7KQ2M9XA"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Icon name="search" className="absolute right-4 top-1/2 -translate-y-1/2 text-outline" />
            </div>
            {invalid && (
              <p className="font-label-sm text-label-sm text-error flex items-center gap-1">
                <Icon name="error" size={14} />
                Saisissez un code de suivi.
              </p>
            )}
            <button
              className="w-full h-14 bg-primary hover:bg-on-primary-fixed-variant text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 transition-colors shadow-sm mt-2"
              type="submit"
            >
              <Icon name="verified" size={20} />
              Vérifier le document
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 my-2">
            <div className="h-px bg-outline-variant flex-1" />
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">ou utiliser</span>
            <div className="h-px bg-outline-variant flex-1" />
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-outline-variant bg-surface">
            <Icon name="qr_code_scanner" size={24} className="text-primary shrink-0" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Scannez le QR imprimé en bas du document avec l'appareil photo de votre téléphone. Avant de lire le résultat, vérifiez que
              l'adresse ouverte est bien <strong className="text-on-surface">{OFFICIAL_VERIFY_HOST}</strong>. En cas de doute, saisissez
              plutôt le code à la main ici.
            </p>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-8 text-center flex items-center justify-center gap-2">
          <Icon name="lock" size={16} className="text-primary-container" />
          Aucune inscription requise
        </p>
        <Link to={ROUTES.personalData} className="font-label-sm text-label-sm text-primary hover:underline mt-2">
          Données personnelles
        </Link>
      </div>
    </div>
  )
}
