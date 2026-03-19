import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/__tests__/test-utils'

const mockPush = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

import { InviteCodeInput } from '../InviteCodeInput'

describe('InviteCodeInput', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })
  it('renders input field and submit button', () => {
    render(<InviteCodeInput />)

    expect(
      screen.getByPlaceholderText(/código de convite/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('navigates to /convite/{code} on submit', async () => {
    const { user } = render(<InviteCodeInput />)

    const input = screen.getByPlaceholderText(/código de convite/i)
    await user.type(input, 'ABC12345')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(mockPush).toHaveBeenCalledWith('/convite/ABC12345')
  })

  it('does not navigate when input is empty', async () => {
    const { user } = render(<InviteCodeInput />)

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('trims whitespace from code', async () => {
    const { user } = render(<InviteCodeInput />)

    const input = screen.getByPlaceholderText(/código de convite/i)
    await user.type(input, '  ABC12345  ')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(mockPush).toHaveBeenCalledWith('/convite/ABC12345')
  })
})
