import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ROUTES } from '../routes'
import { ProtectedRoute } from './ProtectedRoute'

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))
vi.mock('./AuthContext', () => ({ useAuth: useAuthMock }))

function renderProtected(status: 'restoring' | 'authenticated' | 'unauthenticated') {
  useAuthMock.mockReturnValue({ status })
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path={ROUTES.login} element={<div>Page de connexion</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Contenu protégé</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while the session is being restored, revealing neither the page nor its content', () => {
    renderProtected('restoring')
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
    expect(screen.queryByText('Page de connexion')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects to the login page when there is no active session', () => {
    renderProtected('unauthenticated')
    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('renders the protected content once authenticated', () => {
    renderProtected('authenticated')
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })
})
