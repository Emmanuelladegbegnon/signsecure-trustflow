import { Icon } from './Icon'

export type StatusKind =
  | 'valide'
  | 'attente'
  | 'enregistre'
  | 'rejete'
  | 'actif'
  | 'inactif'
  | 'revoque'
  | 'invalide'
  | 'compromis'

// Vocabulaire conforme à CLAUDE.md : jamais "authentifié"/"certifié"/"garanti" —
// on décrit un enregistrement + les contrôles effectués, jamais une garantie absolue.
const STATUS_CONFIG: Record<StatusKind, { label: string; icon: string; className: string }> = {
  valide: { label: 'Validé', icon: 'check_circle', className: 'bg-[#dcfce7] text-[#166534]' },
  enregistre: { label: 'Enregistré', icon: 'task_alt', className: 'bg-[#dcfce7] text-[#166534]' },
  actif: { label: 'Actif', icon: 'check_circle', className: 'bg-[#dcfce7] text-[#166534]' },
  attente: { label: 'En attente', icon: 'pending', className: 'bg-[#fef08a] text-[#854d0e]' },
  rejete: { label: 'Rejeté', icon: 'error', className: 'bg-[#fee2e2] text-[#991b1b]' },
  inactif: { label: 'Inactif', icon: 'cancel', className: 'bg-[#fee2e2] text-[#991b1b]' },
  revoque: { label: 'Révoqué', icon: 'block', className: 'bg-[#fee2e2] text-[#991b1b]' },
  invalide: { label: 'Invalide', icon: 'cancel', className: 'bg-[#fee2e2] text-[#991b1b]' },
  compromis: { label: 'Compromis', icon: 'gpp_bad', className: 'bg-[#fee2e2] text-[#991b1b]' },
}

export function StatusChip({ status, label }: { status: StatusKind; label?: string }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      <Icon name={config.icon} size={14} />
      {label ?? config.label}
    </span>
  )
}
