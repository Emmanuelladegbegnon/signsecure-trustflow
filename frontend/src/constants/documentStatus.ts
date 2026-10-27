import type { StatusKind } from '../components/ui/StatusChip'

// Valeurs telles que renvoyées par GET /api/documents (statut brut de l'énum
// Prisma Document.statut — voir backend/src/modules/documents/status.ts).
export type DocumentStatutValue = 'DRAFT' | 'PENDING_SIGNATURES' | 'SIGNED' | 'REVOKED' | 'RECEIVED' | 'ARCHIVED'

const LABELS: Record<DocumentStatutValue, string> = {
  DRAFT: 'Brouillon',
  PENDING_SIGNATURES: 'En attente de signature',
  SIGNED: 'Signé',
  REVOKED: 'Révoqué',
  RECEIVED: 'Reçu',
  ARCHIVED: 'Archivé',
}

const CHIP_KINDS: Record<DocumentStatutValue, StatusKind> = {
  DRAFT: 'attente',
  PENDING_SIGNATURES: 'attente',
  SIGNED: 'valide',
  REVOKED: 'revoque',
  RECEIVED: 'enregistre',
  ARCHIVED: 'enregistre',
}

export function documentStatutLabel(statut: string): string {
  return LABELS[statut as DocumentStatutValue] ?? statut
}

export function documentStatutChipKind(statut: string): StatusKind {
  return CHIP_KINDS[statut as DocumentStatutValue] ?? 'attente'
}

const ORIGIN_LABELS: Record<string, string> = { SIGN: 'Signature', TRACE: 'Traçabilité' }

export function documentOrigineLabel(origine: string): string {
  return ORIGIN_LABELS[origine] ?? origine
}
