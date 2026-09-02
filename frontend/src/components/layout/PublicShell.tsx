import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PublicShellProps {
  children: ReactNode
  /** Slim brand header shown on transactional screens (OTP, signature confirmation, public verification). */
  withHeader?: boolean
  /** Optional trailing action in the header, e.g. a "Aide" link. */
  headerAction?: ReactNode
  className?: string
}

/**
 * Centered, chrome-free layout used for authentication, transactional
 * confirmations (OTP, success screens) and the public verification flow —
 * anywhere the desktop sidebar/mobile bottom nav don't apply.
 */
export function PublicShell({ children, withHeader = false, headerAction, className = '' }: PublicShellProps) {
  return (
    <div className="min-h-screen w-full bg-background text-on-surface font-body-md flex flex-col">
      {withHeader && (
        <header className="flex justify-between items-center w-full h-16 px-gutter bg-surface-container-lowest shadow-sm z-40">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold text-headline-sm">shield_lock</span>
            <span className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</span>
          </Link>
          {headerAction}
        </header>
      )}
      <main className={`flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop ${className}`}>
        {children}
      </main>
    </div>
  )
}
