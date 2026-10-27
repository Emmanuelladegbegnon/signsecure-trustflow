import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { canAccess } from '../../auth/access'
import { Icon } from '../ui/Icon'
import { MOBILE_NAV, type NavKey } from './nav'

export function MobileBottomNav({ active }: { active: NavKey }) {
  const { user } = useAuth()
  const visibleNav = MOBILE_NAV.filter((item) => canAccess(item.key, user?.roles))
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface border-t border-outline-variant shadow-lg rounded-t-xl">
      {visibleNav.map((item) => {
        const isActive = active === item.key
        return (
          <Link
            key={item.key}
            to={item.to}
            className={
              isActive
                ? 'flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1'
                : 'flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high p-2 rounded-lg transition-colors'
            }
          >
            <Icon name={item.icon} filled={isActive} size={22} />
            <span className="font-label-sm text-label-sm mt-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
