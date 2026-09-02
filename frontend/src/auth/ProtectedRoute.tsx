import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullscreenSpinner } from '../components/ui/FullscreenSpinner'
import { ROUTES } from '../routes'
import { useAuth } from './AuthContext'

/**
 * Garde-fou côté client : aucune route protégée ne rend son contenu sans
 * session active. Purement un confort d'UX (redirection propre, pas de flash
 * de contenu) — le serveur reste la seule autorité réelle sur chaque endpoint.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') {
    return <FullscreenSpinner />
  }

  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
