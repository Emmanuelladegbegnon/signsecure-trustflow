import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }))

vi.mock('../lib/httpClient', () => ({
  apiRequest: apiRequestMock,
  ApiRequestError: class extends Error {},
  setUnauthorizedHandler: vi.fn(),
  setReauthHandler: vi.fn(),
}))

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
  })

  it('starts unauthenticated when the server has no session cookie', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('401'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    // Restauration silencieuse : un 401 au chargement n'est pas une « session expirée ».
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me', { notifyUnauthorized: false })
  })

  it('restores an authenticated session via GET /auth/me (httpOnly cookie)', async () => {
    apiRequestMock.mockResolvedValueOnce({ id: '1', nom: 'Kone', prenom: 'Awa', roles: ['Superviseur'] })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('Awa Kone')
    // Aucun jeton n'est stocké côté navigateur.
    expect(Object.keys(sessionStorage)).toEqual([])
  })

  it('verifyOtp sets the user and marks the session authenticated, without storing any token', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockRejectedValueOnce(new Error('401')) // /auth/me on mount
    apiRequestMock.mockResolvedValueOnce({ user: { id: '2', nom: 'Diallo', prenom: 'Kouassi', roles: ['Administrateur'] } })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(() => user.click(screen.getByText('verify')))

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('Kouassi Diallo')
    expect(Object.keys(sessionStorage)).toEqual([])
  })

  it('logout clears the session even if the server call fails', async () => {
    const user = userEvent.setup()
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

  })
})
