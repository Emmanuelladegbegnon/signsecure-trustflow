import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip } from './StatusChip'

describe('StatusChip', () => {
  it('renders the default label for a known status', () => {
    render(<StatusChip status="valide" />)
    expect(screen.getByText('Validé')).toBeInTheDocument()
  })

  it('renders an icon alongside the text — never color alone (CLAUDE.md)', () => {
    const { container } = render(<StatusChip status="revoque" />)
    expect(screen.getByText('Révoqué')).toBeInTheDocument()
    expect(container.querySelector('.material-symbols-outlined')).not.toBeNull()
  })

  it('never uses the banned "Authentifié" wording — the enregistre status reads "Enregistré"', () => {
    render(<StatusChip status="enregistre" />)
    expect(screen.getByText('Enregistré')).toBeInTheDocument()
    expect(screen.queryByText(/authentifi/i)).not.toBeInTheDocument()
  })

  it('lets the caller override the displayed label while keeping the status tone', () => {
    render(<StatusChip status="attente" label="Invité" />)
    expect(screen.getByText('Invité')).toBeInTheDocument()
    expect(screen.queryByText('En attente')).not.toBeInTheDocument()
  })
})
