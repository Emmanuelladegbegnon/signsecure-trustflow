/**
 * Les valeurs d'énum Prisma (identifiants sans accent) ne peuvent pas être les
 * libellés exacts attendus par le front (frontend/src/roles.ts) — cette table
 * fait le pont aux deux frontières de l'API : sortie (roles renvoyés au
 * client) et entrée (roles reçus depuis l'admin). En interne (JWT, requireRole),
 * on continue à utiliser l'énum Prisma directement.
 */
import type { Role } from '@prisma/client'

export const ROLE_LABELS: Record<Role, string> = {
  AGENT_RECEPTION: 'Agent de réception',
  SIGNATAIRE: 'Signataire',
  SUPERVISEUR: 'Superviseur',
  VERIFICATEUR: 'Vérificateur',
  ADMINISTRATEUR: 'Administrateur',
}

const LABEL_TO_ROLE: Record<string, Role> = Object.fromEntries(
  Object.entries(ROLE_LABELS).map(([role, label]) => [label, role as Role]),
)

export function toRoleLabels(roles: Role[]): string[] {
  return roles.map((r) => ROLE_LABELS[r])
}

export function fromRoleLabel(label: string): Role | undefined {
  return LABEL_TO_ROLE[label]
}
