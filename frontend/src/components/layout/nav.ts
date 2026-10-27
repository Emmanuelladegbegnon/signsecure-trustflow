import { ROUTES } from '../../routes'

export type NavKey = 'dashboard' | 'sign' | 'verify' | 'trace' | 'identity' | 'users' | 'audit' | 'permissions'

export interface NavItem {
  key: NavKey
  label: string
  icon: string
  to: string
}

/** Primary navigation, shown to every authenticated role. */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'dashboard', to: ROUTES.dashboard },
  { key: 'sign', label: 'Signer', icon: 'edit_document', to: ROUTES.newDocument },
  { key: 'verify', label: 'Vérifier', icon: 'verified_user', to: ROUTES.verifyPublic },
  { key: 'trace', label: 'Tracer', icon: 'analytics', to: ROUTES.traceabilityList },
]

/** Admin-only navigation, rendered as a separate section below a divider. */
export const ADMIN_NAV: NavItem[] = [
  { key: 'identity', label: "Pièces d'identité", icon: 'badge', to: ROUTES.identityReview },
  { key: 'users', label: 'Utilisateurs', icon: 'group', to: ROUTES.adminUsers },
  { key: 'audit', label: "Journal d'audit", icon: 'history', to: ROUTES.adminAuditLog },
  { key: 'permissions', label: 'Permissions', icon: 'admin_panel_settings', to: ROUTES.adminPermissions },
]

/** Shortlist used by the mobile bottom tab bar (kept to 4 items by design). */
export const MOBILE_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Tableau', icon: 'dashboard', to: ROUTES.dashboard },
  { key: 'sign', label: 'Signer', icon: 'edit_document', to: ROUTES.newDocument },
  { key: 'verify', label: 'Vérifier', icon: 'qr_code_scanner', to: ROUTES.verifyPublic },
  { key: 'trace', label: 'Tracer', icon: 'analytics', to: ROUTES.traceabilityList },
]
