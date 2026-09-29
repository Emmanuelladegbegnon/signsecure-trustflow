import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '../routes'
import { canAccess, type AccessArea } from './access'
import { useAuth } from './AuthContext'

/**
 * Deuxième garde-fou, imbriqué sous ProtectedRoute : cache côté client les
 * écrans qui ne servent à rien pour le rôle du compte connecté (CLAUDE.md §
 * RBAC — un compte Signataire n'a par exemple aucun accès au back-office).
 * Confort d'UX uniquement — chaque endpoint réel revérifie déjà le rôle côté
 * serveur (requireRole), qui reste seul juge final.
 */
export function RoleRoute({ area }: { area: AccessArea }) {
  const { user } = useAuth()
  if (!canAccess(area, user?.roles)) {
    return <Navigate to={ROUTES.dashboard} replace />
  }
  return <Outlet />
}
