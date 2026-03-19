import { describe, expect, it } from 'vitest'
import { render, screen } from '@/__tests__/test-utils'
import { InviteLanding } from '../InviteLanding'

describe('InviteLanding', () => {
  it('shows inviter name when provided', () => {
    render(<InviteLanding code="ABC12345" inviterName="João Silva" />)

    expect(screen.getByText(/João Silva/)).toBeInTheDocument()
  })

  it('shows generic message when inviter name is null', () => {
    render(<InviteLanding code="ABC12345" inviterName={null} />)

    expect(screen.getByText(/convite para acessar/i)).toBeInTheDocument()
  })

  it('renders sign-in CTA button', () => {
    render(<InviteLanding code="ABC12345" inviterName="João" />)

    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('renders link to waitlist', () => {
    render(<InviteLanding code="ABC12345" inviterName="João" />)

    const link = screen.getByRole('link', { name: /lista de espera/i })
    expect(link).toHaveAttribute('href', '/lista-espera')
  })
})
