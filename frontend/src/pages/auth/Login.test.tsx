import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../../lib/httpClient'
import { ROUTES } from '../../routes'
import { Login } from './Login'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ login: loginMock }) }))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.login]}>
      <Routes>
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.otpLogin} element={<div>Écran OTP</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it('shows validation errors and never calls the API when the form is empty', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText('Adresse e-mail requise.')).toBeInTheDocument()
    expect(screen.getByText('Mot de passe requis.')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed email address before contacting the API', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/adresse e-mail/i), 'pas-un-email')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText('Adresse e-mail invalide.')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('calls login() with the trimmed credentials and navigates to the OTP screen on success', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValueOnce({ requiresOtp: true, otpChannel: 'sms' })
    renderLogin()

    await user.type(screen.getByLabelText(/adresse e-mail/i), '  admin@entreprise.com  ')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(loginMock).toHaveBeenCalledWith('admin@entreprise.com', 'secret123')
    expect(await screen.findByText('Écran OTP')).toBeInTheDocument()
  })

  it('surfaces the API error message instead of navigating away on failure', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValueOnce(new ApiRequestError(401, { code: 'INVALID_CREDENTIALS', message: 'Identifiants invalides.' }))
    renderLogin()

    await user.type(screen.getByLabelText(/adresse e-mail/i), 'admin@entreprise.com')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText('Identifiants invalides.')).toBeInTheDocument()
    expect(screen.queryByText('Écran OTP')).not.toBeInTheDocument()
  })
})
