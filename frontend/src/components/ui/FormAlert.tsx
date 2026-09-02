import type { ReactNode } from 'react'
import { Icon } from './Icon'

type AlertTone = 'error' | 'success' | 'info'

const TONE: Record<AlertTone, { icon: string; className: string }> = {
  error: { icon: 'error', className: 'bg-error-container text-on-error-container' },
  success: { icon: 'check_circle', className: 'bg-[#e8f5e9] text-[#2e7d32]' },
  info: { icon: 'info', className: 'bg-secondary-container text-on-secondary-container' },
}

/** Bannière de statut — toujours icône + texte, jamais la couleur seule (CLAUDE.md). */
export function FormAlert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  const { icon, className } = TONE[tone]
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 font-body-sm text-body-sm ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} size={18} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
