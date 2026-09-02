import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { ROUTES } from '../../routes'
import { ADMIN_NAV, PRIMARY_NAV, type NavKey } from './nav'

const linkBase =
  'flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-label-md transition-colors'
const linkInactive = 'text-on-surface-variant hover:bg-surface-container-high'
const linkActive = 'text-primary font-bold border-r-4 border-primary bg-primary-container/10'

export function DesktopSidebar({ active }: { active: NavKey }) {
  const navigate = useNavigate()

  return (
    <nav className="hidden md:flex flex-col h-screen p-unit overflow-y-auto bg-surface fixed left-0 top-0 w-[280px] border-r border-outline-variant shadow-sm z-50">
      <Link to={ROUTES.dashboard} className="mb-6 p-4 block">
        <span className="font-headline-md text-headline-md font-bold text-primary">SignSecure TrustFlow</span>
      </Link>

      <div className="flex items-center gap-4 px-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
          AK
        </div>
        <div>
          <div className="font-label-md text-label-md font-semibold">Awa KONE</div>
          <div className="font-label-sm text-label-sm text-on-surface-variant">Superviseur</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(ROUTES.newDocument)}
        className="mb-6 mx-4 py-3 px-4 bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
      >
        <Icon name="add" size={20} />
        Nouveau Document
      </button>

      <ul className="flex-1 space-y-2">
        {PRIMARY_NAV.map((item) => (
          <li key={item.key}>
            <Link to={item.to} className={`${linkBase} ${active === item.key ? linkActive : linkInactive}`}>
              <Icon name={item.icon} filled={active === item.key} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="space-y-1 mb-2">
        <p className="px-4 mb-1 font-label-sm text-label-sm text-on-surface-variant tracking-wide">ADMINISTRATION</p>
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className={`${linkBase} ${active === item.key ? linkActive : linkInactive}`}>
                <Icon name={item.icon} filled={active === item.key} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-outline-variant pt-4">
        <ul className="space-y-2">
          <li>
            <Link to="#" className={`${linkBase} ${linkInactive}`}>
              <Icon name="settings" />
              Paramètres
            </Link>
          </li>
          <li>
            <Link to={ROUTES.login} className={`${linkBase} ${linkInactive}`}>
              <Icon name="logout" />
              Déconnexion
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
