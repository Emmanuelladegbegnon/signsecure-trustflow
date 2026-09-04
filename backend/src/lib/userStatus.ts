import type { UserStatus } from '@prisma/client'

/** API_CONTRACT.md attend "invite" | "actif" | "suspendu" (minuscules) en sortie, l'énum Prisma reste en majuscules en interne. */
const STATUS_LABELS: Record<UserStatus, 'invite' | 'actif' | 'suspendu'> = {
  INVITE: 'invite',
  ACTIF: 'actif',
  SUSPENDU: 'suspendu',
}

export function toStatusLabel(statut: UserStatus): 'invite' | 'actif' | 'suspendu' {
  return STATUS_LABELS[statut]
}
