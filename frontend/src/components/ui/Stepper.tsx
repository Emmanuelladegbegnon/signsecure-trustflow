import { Icon } from './Icon'

interface StepperProps {
  /** Libellés affichés, dans l'ordre réel des écrans du parcours. */
  steps: string[]
  /** Index (0-based) de l'écran actuellement affiché — jamais figé sur 0 : chaque écran du parcours doit passer son propre index. */
  currentStep: number
}

/**
 * Repère de progression pour un parcours multi-écrans (plusieurs routes
 * distinctes, pas un simple multi-étapes sur une seule page) : à utiliser sur
 * CHAQUE écran du parcours avec le même tableau `steps` et l'index réel de
 * l'écran affiché, pour qu'on sache toujours où on en est et ce qui reste.
 */
export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between relative max-w-2xl mx-auto w-full">
      <div className="absolute left-0 top-4 w-full h-1 bg-surface-variant -z-10 rounded-full" />
      {steps.map((label, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={label} className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm shadow-sm ring-4 ring-background ${
                active ? 'bg-primary text-on-primary' : done ? 'bg-primary/60 text-on-primary' : 'bg-surface-variant text-on-surface-variant'
              }`}
            >
              {done ? <Icon name="check" size={16} /> : i + 1}
            </div>
            <span className={`font-label-sm text-label-sm text-center ${active ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
