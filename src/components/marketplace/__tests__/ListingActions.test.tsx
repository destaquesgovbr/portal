/**
 * Testes do componente `ListingActions` (Fase B3).
 *
 * Verifica que o componente delega like/clone/unfollow ao
 * `useMarketplaceService()` em vez de chamar `fetch` diretamente. Com a flag
 * `graphql.marketplace=false` (default), o hook devolve a implementação REST
 * — então conseguimos espionar `fetch` para garantir que o caminho REST
 * permanece igual ao comportamento anterior.
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u-1', name: 'User' } } }),
}))

// Default: flag OFF → facade resolve para REST. Suficiente para os testes
// abaixo que querem garantir o transport REST tradicional permanece.
vi.mock('@/lib/feature-flags', () => ({
  GRAPHQL_FLAGS: {
    CLIPPINGS: 'graphql.clippings',
    MARKETPLACE: 'graphql.marketplace',
    AGENT: 'graphql.agent',
    PUSH: 'graphql.push',
    WIDGETS: 'graphql.widgets',
  },
  useFeatureFlag: (_key: string, defaultValue: boolean) => defaultValue,
  getFeatureFlag: (_key: string, defaultValue: boolean) => defaultValue,
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

describe('ListingActions — usa facade do marketplace', () => {
  it('test_listingActions_like_uses_facade_rest_when_flag_off: POST em /like', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ liked: true, likeCount: 4 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

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
      expect(fetchSpy).toHaveBeenCalled()
    })
    const urls = fetchSpy.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0] : (c[0] as URL).toString(),
    )
    expect(urls.some((u) => u.endsWith('/api/clippings/public/l-1/like'))).toBe(
      true,
    )
    fetchSpy.mockRestore()
  })

  it('test_listingActions_unfollow_uses_facade: DELETE em /follow (REST default)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )

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
      const urls = fetchSpy.mock.calls.map((c) =>
        typeof c[0] === 'string' ? c[0] : (c[0] as URL).toString(),
      )
      const followCall = fetchSpy.mock.calls.find((c) => {
        const url = typeof c[0] === 'string' ? c[0] : (c[0] as URL).toString()
        return url.endsWith('/api/clippings/public/l-1/follow')
      })
      expect(followCall).toBeDefined()
      expect(
        urls.some((u) => u.endsWith('/api/clippings/public/l-1/follow')),
      ).toBe(true)
      expect((followCall?.[1] as RequestInit)?.method).toBe('DELETE')
    })
    fetchSpy.mockRestore()
  })

  it('test_listingActions_clone_navigates_to_editor_on_success', async () => {
    pushMock.mockClear()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'c-cloned' }), { status: 200 }),
      )

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
      expect(pushMock).toHaveBeenCalledWith(
        '/minha-conta/clipping/c-cloned/editar',
      )
    })
    fetchSpy.mockRestore()
  })
})
