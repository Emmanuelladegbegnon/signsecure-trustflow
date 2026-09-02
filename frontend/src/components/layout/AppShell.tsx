import type { ReactNode } from 'react'
import { DesktopSidebar } from './DesktopSidebar'
import { TopHeader } from './TopHeader'
import { MobileBottomNav } from './MobileBottomNav'
import type { NavKey } from './nav'

interface AppShellProps {
  active: NavKey
  children: ReactNode
  /** Skip the default page padding/max-width wrapper — for screens that manage their own content layout (e.g. split panels). */
  bleed?: boolean
}

/** Standard authenticated layout: fixed desktop sidebar + sticky header + mobile bottom tab bar. */
export function AppShell({ active, children, bleed = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md flex">
      <DesktopSidebar active={active} />
      <main className="flex-1 md:ml-[280px] flex flex-col min-h-screen pb-20 md:pb-0">
        <TopHeader />
        {bleed ? (
          children
        ) : (
          <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full flex-1">
            {children}
          </div>
        )}
      </main>
      <MobileBottomNav active={active} />
    </div>
  )
}
