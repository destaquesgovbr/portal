import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@/__tests__/test-utils'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { WaitlistForm } from '../WaitlistForm'

describe('WaitlistForm', () => {
  it('renders email input and submit button', () => {
    render(<WaitlistForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /entrar na lista/i }),
    ).toBeInTheDocument()
  })

  it('renders optional name input', () => {
    render(<WaitlistForm />)

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  })

  it('shows validation error when email is empty and form submitted', async () => {
    const { user } = render(<WaitlistForm />)

    // Submit without filling email — react-hook-form requires it
    await user.click(screen.getByRole('button', { name: /entrar na lista/i }))

    await waitFor(() => {
      // Zod custom message: "Email inválido"
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })
})
