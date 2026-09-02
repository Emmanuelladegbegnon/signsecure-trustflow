import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { OtpInputGroup } from '../../components/ui/OtpInputGroup'
import { ROUTES } from '../../routes'

export function OtpLogin() {
  const navigate = useNavigate()
  const [complete, setComplete] = useState(false)
  const [timeLeft, setTimeLeft] = useState(45)

  useEffect(() => {
    if (timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  const seconds = timeLeft > 0 ? String(timeLeft).padStart(2, '0') : '00'

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop antialiased">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Icon name="verified" filled size={32} />
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight">SignSecure TrustFlow</span>
        </div>
      </div>
      <main className="w-full max-w-[420px]">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_1px_3px_rgba(15,23,42,0.1)] p-8 border border-surface-variant flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center text-primary mb-6">
            <Icon name="lock_clock" size={32} />
          </div>
          <div className="text-center mb-8">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Vérification en deux étapes</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Un code a été envoyé à <span className="font-label-md text-label-md text-on-surface">+229 97 00 00 00</span>
            </p>
          </div>
          <form
            className="w-full flex flex-col gap-8"
            onSubmit={(e) => {
              e.preventDefault()
              if (complete) navigate(ROUTES.dashboard)
            }}
          >
            <OtpInputGroup length={6} onChange={(_, isComplete) => setComplete(isComplete)} />
            <button
              className={`w-full py-3 px-4 bg-primary text-on-primary font-label-md text-label-md rounded flex items-center justify-center gap-2 transition-all hover:bg-primary-fixed-dim/90 hover:text-on-primary-fixed ${
                complete ? '' : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!complete}
              type="submit"
            >
              Valider
            </button>
          </form>
          <div className="mt-6 text-center">
            {timeLeft > 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-1">
                <Icon name="refresh" size={16} />
                Renvoyer le code dans <span className="font-label-sm text-label-sm text-on-surface w-[40px] text-left">00:{seconds}</span>
              </p>
            ) : (
              <button
                className="mt-2 font-label-sm text-label-sm text-primary hover:underline underline-offset-2"
                onClick={() => setTimeLeft(45)}
                type="button"
              >
                Renvoyer le code maintenant
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
