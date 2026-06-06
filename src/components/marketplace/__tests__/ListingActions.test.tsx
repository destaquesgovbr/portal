/**
 * Testes do componente `ListingActions`.
 *
 * Verifica que o componente delega like/clone/unfollow ao
 * `useMarketplaceService()` (caminho GraphQL único). Mockamos o serviço do
 * marketplace e asseguramos que cada ação chama o método correspondente com
 * o `listingId` certo.
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u-1', name: 'User' } } }),
}))

// Facade GraphQL-only: o componente delega ao serviço do marketplace.
const toggleLike = vi.fn()
const unsubscribe = vi.fn()
const clone = vi.fn()
vi.mock('@/services/marketplace', () => ({
  useMarketplaceService: () => ({ toggleLike, unsubscribe, clone }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: refreshMock,
    prefetch: vi.fn(),
  }),
  usePathname: () => '/clippings/l-1',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

import { render } from '@/__tests__/test-utils'
import type { MarketplaceListing } from '@/types/clipping'
import { ListingActions } from '../ListingActions'

const baseListing: MarketplaceListing = {
  id: 'l-1',
  authorUserId: 'u-2',
  authorDisplayName: 'Outro',
  sourceClippingId: 'c-1',
  name: 'Listing 1',
  description: 'desc',
  recortes: [],
  prompt: '',
  likeCount: 3,
  followerCount: 2,
  cloneCount: 1,
  publishedAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-02T10:00:00Z',
  active: true,
}

describe('ListingActions — delega ao facade GraphQL do marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('curtir → chama toggleLike(listingId) no serviço', async () => {
    toggleLike.mockResolvedValue({ liked: true, likeCount: 4 })

    render(
      <ListingActions
        listing={baseListing}
        userFollows={false}
        userHasLiked={false}
        hasTelegram={false}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Curtir/i }))

    await waitFor(() => {
      expect(toggleLike).toHaveBeenCalledWith('l-1')
    })
  })

  it('deixar de seguir → chama unsubscribe(listingId) no serviço', async () => {
    unsubscribe.mockResolvedValue(undefined)

    render(
      <ListingActions
        listing={baseListing}
        userFollows={true}
        userHasLiked={false}
        hasTelegram={false}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Seguindo/i }))

    await waitFor(() => {
      expect(unsubscribe).toHaveBeenCalledWith('l-1')
    })
  })

  it('clonar → chama clone(listingId) e navega para o editor', async () => {
    clone.mockResolvedValue({ id: 'c-cloned' })

    render(
      <ListingActions
        listing={baseListing}
        userFollows={false}
        userHasLiked={false}
        hasTelegram={false}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Clonar/i }))

    await waitFor(() => {
      expect(clone).toHaveBeenCalledWith('l-1')
      expect(pushMock).toHaveBeenCalledWith(
        '/minha-conta/clipping/c-cloned/editar',
      )
    })
  })
})
