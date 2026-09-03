import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OtpInputGroup } from './OtpInputGroup'

describe('OtpInputGroup', () => {
  it('renders the requested number of digit boxes', () => {
    render(<OtpInputGroup length={6} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('auto-advances focus to the next box as digits are typed, and reports completion', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInputGroup length={4} onChange={onChange} />)
    const boxes = screen.getAllByRole('textbox')

    await user.type(boxes[0], '1')
    expect(boxes[1]).toHaveFocus()
    await user.type(boxes[1], '2')
    expect(boxes[2]).toHaveFocus()
    await user.type(boxes[2], '3')
    await user.type(boxes[3], '4')

    expect(onChange).toHaveBeenLastCalledWith('1234', true)
  })

  it('reports incomplete while boxes remain empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInputGroup length={4} onChange={onChange} />)
    const boxes = screen.getAllByRole('textbox')

    await user.type(boxes[0], '1')

    expect(onChange).toHaveBeenLastCalledWith('1', false)
  })

  it('moves focus back to the previous box on backspace from an empty box', async () => {
    const user = userEvent.setup()
    render(<OtpInputGroup length={4} />)
    const boxes = screen.getAllByRole('textbox')

    await user.type(boxes[0], '1')
    expect(boxes[1]).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(boxes[0]).toHaveFocus()
  })

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInputGroup length={4} onChange={onChange} />)
    const boxes = screen.getAllByRole('textbox')

    await user.type(boxes[0], 'a')

    expect(boxes[0]).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith('', false)
  })
})
