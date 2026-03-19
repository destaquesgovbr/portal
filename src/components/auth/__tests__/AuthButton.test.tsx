import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/__tests__/test-utils'

const mockPush = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
  }
})

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

import { useSession } from 'next-auth/react'
import { AuthButton } from '../AuthButton'

describe('AuthButton', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders loading skeleton while session is loading', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    })

    render(<AuthButton />)

    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('fetches providers and calls signIn when clicking Entrar (unauthenticated)', async () => {
    const { signIn } = await import('next-auth/react')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ govbr: { id: 'govbr', name: 'Gov.Br' } }),
      }),
    )

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })

    const { user } = render(<AuthButton />)

    const button = screen.getByRole('button', { name: /entrar/i })
    await user.click(button)

    expect(signIn).toHaveBeenCalledWith('govbr', {
      callbackUrl: '/auth/postlogin',
    })
  })

  it('shows user avatar when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: '1', name: 'João Silva', email: 'joao@example.com' },
        expires: '',
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<AuthButton />)

    expect(screen.getByText('JS')).toBeInTheDocument()
  })
})
