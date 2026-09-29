import type { Role } from '../roles'
import type { NavKey } from '../components/layout/nav'

/**
 * Restriction d'accès par rôle, côté frontend uniquement (confort d'UX — le
 * serveur reste seul juge final, comme pour ProtectedRoute). Objectif :
 * qu'un compte ne voie pas un menu/écran qui ne lui sert à rien vu son
 * profil de permissions (CLAUDE.md § RBAC, seed.ts § profils).
 *
 * - "sign" et "verify" sont ouverts à tout compte interne, quel que soit son
 *   rôle : POST /api/documents ne pose déjà aucune restriction de rôle côté
 *   serveur (requireAuth seul — voir backend/src/modules/sign/routes.ts), et
 *   un compte "Signataire" doit pouvoir initier et suivre ses propres
 *   dossiers depuis le back-office, pas seulement signer via le lien à usage
 *   unique reçu par email (CLAUDE.md § Sign) — sinon la question se pose de
 *   savoir pourquoi un administrateur lui créerait un compte.
 * - "trace" reste le seul module filtré par rôle : c'est là qu'un filtrage
 *   a du sens (constitution du dossier de preuve, réception physique), pas
 *   sur l'acte de signer ou de vérifier.
 * - "audit" reproduit exactement la règle serveur de GET /api/admin/audit
 *   (Administrateur ET Vérificateur — voir backend/src/modules/admin/routes.ts).
 */
export type AccessArea = NavKey | 'myFolders'

const ACCESS: Record<AccessArea, Role[] | 'all'> = {
  dashboard: 'all',
  myFolders: 'all',
  verify: 'all',
  sign: 'all',
  trace: ['Administrateur', 'Superviseur', 'Agent de réception', 'Vérificateur'],
  users: ['Administrateur'],
  audit: ['Administrateur', 'Vérificateur'],
  permissions: ['Administrateur'],
}

export function canAccess(area: AccessArea, roles: readonly string[] | undefined): boolean {
  const allowed = ACCESS[area]
  if (allowed === 'all') return true
  if (!roles || roles.length === 0) return false
  return roles.some((r) => (allowed as readonly string[]).includes(r))
}
