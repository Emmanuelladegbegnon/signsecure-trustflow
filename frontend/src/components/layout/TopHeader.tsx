import { Icon } from '../ui/Icon'

export function TopHeader() {
  return (
    <header className="flex justify-between items-center w-full h-16 px-gutter z-40 bg-white shadow-sm sticky top-0">
      <div className="md:hidden">
        <span className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</span>
      </div>
      <div className="hidden md:flex flex-1">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input
            type="text"
            placeholder="Rechercher..."
            className="pl-10 pr-4 py-2 border border-outline-variant rounded-full text-body-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="hidden md:flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-primary font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
        >
          Démonstration
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs md:hidden">
          AK
        </div>
      </div>
    </header>
  )
}
