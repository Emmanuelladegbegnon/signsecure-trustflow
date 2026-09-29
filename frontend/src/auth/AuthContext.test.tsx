import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

const { apiRequestMock, setAuthTokenMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  setAuthTokenMock: vi.fn(),
}))

vi.mock('../lib/httpClient', () => ({
  apiRequest: apiRequestMock,
  setAuthToken: setAuthTokenMock,
  setUnauthorizedHandler: vi.fn(),
}))

const TOKEN_KEY = 'signsecure_auth_token'

function Probe() {
  const { status, user, login, verifyOtp, logout } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? `${user.prenom} ${user.nom}` : 'none'}</span>
      <button onClick={() => login('a@b.com', 'pw')}>login</button>
      <button onClick={() => verifyOtp('a@b.com', '123456')}>verify</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
    apiRequestMock.mockReset()
    setAuthTokenMock.mockReset()
  })

  it('starts unauthenticated when there is no stored session', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    expect(apiRequestMock).not.toHaveBeenCalled()
  })

  it('restores an authenticated session via GET /auth/me when a token is already stored', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'existing-token')
    apiRequestMock.mockResolvedValueOnce({ id: '1', nom: 'Kone', prenom: 'Awa', roles: ['Superviseur'] })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('Awa Kone')
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me')
    expect(setAuthTokenMock).toHaveBeenCalledWith('existing-token')
  })

  it('clears an invalid stored session and falls back to unauthenticated', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'stale-token')
    apiRequestMock.mockRejectedValueOnce(new Error('401'))

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('verifyOtp stores the token, sets the user, and marks the session authenticated', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockResolvedValueOnce({ token: 'new-token', user: { id: '2', nom: 'Diallo', prenom: 'Kouassi', roles: ['Administrateur'] } })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(() => user.click(screen.getByText('verify')))

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('Kouassi Diallo')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('new-token')
    expect(setAuthTokenMock).toHaveBeenCalledWith('new-token')
  })

  it('logout clears the session even if the server call fails', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem(TOKEN_KEY, 'existing-token')
    apiRequestMock.mockResolvedValueOnce({ id: '1', nom: 'Kone', prenom: 'Awa', roles: ['Superviseur'] }) // /auth/me on mount
    apiRequestMock.mockRejectedValueOnce(new Error('network down')) // /auth/logout

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await act(() => user.click(screen.getByText('logout')))

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(setAuthTokenMock).toHaveBeenLastCalledWith(null)
  })
})
