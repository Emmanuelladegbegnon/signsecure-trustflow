import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, setUnauthorizedHandler } from '../lib/httpClient'
import { SESSION_NOTICE_KEY } from './sessionNotice'
import { ReauthDialog } from './ReauthDialog'

export interface AuthUser {
  id: string
  nom: string
  prenom: string
  email?: string
  telephone?: string
  roles: string[]
}

interface LoginResponse {
  requiresOtp: true
  otpChannel: 'sms' | 'email'
}

interface OtpVerifyResponse {
  user: AuthUser
}

interface OtpResendResponse {
  success: true
  nextResendAt: string
}

type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  login: (email: string, password: string) => Promise<LoginResponse>
  verifyOtp: (email: string, code: string) => Promise<void>
  resendOtp: (email: string) => Promise<OtpResendResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// La session est un cookie httpOnly posé par le serveur : ce code ne le lit
// jamais. Au chargement, GET /auth/me indique simplement si une session existe.

// Aligné sur SESSION_IDLE_MINUTES côté serveur (15 min par défaut) : le serveur
// reste seul juge, cette minuterie évite seulement de laisser un écran ouvert
// sur un poste partagé.
const IDLE_TIMEOUT_MS = 15 * 60_000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // stockage indisponible (navigation privée stricte) : sans conséquence
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [user, setUser] = useState<AuthUser | null>(null)

  const clearSession = useCallback((notice?: string) => {
    if (notice) writeStorage(SESSION_NOTICE_KEY, notice)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  // Toute réponse 401 sur une requête authentifiée ferme la session locale.
  useEffect(() => {
    setUnauthorizedHandler((error) => {
      clearSession(error.code === 'SESSION_IDLE_TIMEOUT' ? error.message : 'Votre session a expiré. Veuillez vous reconnecter.')
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  // Déconnexion automatique après inactivité côté client.
  useEffect(() => {
    if (status !== 'authenticated') return
    let timer = window.setTimeout(onIdle, IDLE_TIMEOUT_MS)
    function onIdle() {
      apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
      clearSession("Vous avez été déconnecté après 15 minutes d'inactivité.")
    }
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(onIdle, IDLE_TIMEOUT_MS)
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset))
    }
  }, [status, clearSession])

  useEffect(() => {
    apiRequest<AuthUser>('/auth/me', { notifyUnauthorized: false })
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => setStatus('unauthenticated'))
  }, [])

  const login = (email: string, password: string) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false })

  const verifyOtp = async (email: string, code: string) => {
    const result = await apiRequest<OtpVerifyResponse>('/auth/otp/verify', { method: 'POST', body: { email, code }, auth: false })
    setUser(result.user)
    setStatus('authenticated')
  }

  const resendOtp = (email: string) => apiRequest<OtpResendResponse>('/auth/otp/resend', { method: 'POST', body: { email }, auth: false })

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // best-effort : on nettoie quand même la session côté client si l'appel échoue
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }

  const value = useMemo<AuthContextValue>(() => ({ status, user, login, verifyOtp, resendOtp, logout }), [status, user])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {status === 'authenticated' && <ReauthDialog />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé sous un <AuthProvider>')
  return ctx
}
