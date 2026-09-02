import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, setAuthToken } from '../lib/httpClient'

export interface AuthUser {
  id: string
  nom: string
  prenom: string
  email?: string
  roles: string[]
}

interface LoginResponse {
  requiresOtp: true
  otpChannel: 'sms' | 'email'
}

interface OtpVerifyResponse {
  token: string
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

// sessionStorage plutôt que localStorage : le token ne survit pas à la fermeture
// de l'onglet, cohérent avec l'exigence CLAUDE.md de sessions courtes pour les
// comptes internes (pas de "souviens-toi de moi" en MVP).
const TOKEN_STORAGE_KEY = 'signsecure_auth_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) {
      setStatus('unauthenticated')
      return
    }
    setAuthToken(stored)
    apiRequest<AuthUser>('/auth/me')
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        setAuthToken(null)
        setStatus('unauthenticated')
      })
  }, [])

  const login = (email: string, password: string) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false })

  const verifyOtp = async (email: string, code: string) => {
    const result = await apiRequest<OtpVerifyResponse>('/auth/otp/verify', { method: 'POST', body: { email, code }, auth: false })
    sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token)
    setAuthToken(result.token)
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
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      setAuthToken(null)
      setUser(null)
      setStatus('unauthenticated')
    }
  }

  const value = useMemo<AuthContextValue>(() => ({ status, user, login, verifyOtp, resendOtp, logout }), [status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé sous un <AuthProvider>')
  return ctx
}
