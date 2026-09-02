import { useRef, useState, type KeyboardEvent } from 'react'

interface OtpInputGroupProps {
  length?: number
  onChange?: (value: string, complete: boolean) => void
}

/** Auto-advancing one-digit-per-box OTP input, shared by every 2FA/confirmation screen. */
export function OtpInputGroup({ length = 6, onChange }: OtpInputGroupProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''))
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const update = (index: number, raw: string) => {
    const value = raw.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[index] = value
    setDigits(next)
    onChange?.(next.join(''), next.every((d) => d.length === 1))
    if (value && index < length - 1) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          aria-label={`Chiffre ${i + 1}`}
          autoFocus={i === 0}
          value={digit}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          maxLength={1}
          inputMode="numeric"
          type="text"
          className="w-12 h-14 text-center font-headline-md text-headline-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      ))}
    </div>
  )
}
