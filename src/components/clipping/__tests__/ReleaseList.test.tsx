import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { ReleaseList } from '../ReleaseList'

// Sentinela: nenhum loadMore deve tocar REST (ambos os contextos usam o facade).
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock do facade de clipping: o contexto do AUTOR usa
// `useClippingService().listReleases(clippingId, { before })`.
const listReleasesMock = vi.fn()
vi.mock('@/services/clipping', () => ({
  useClippingService: () => ({
    listReleases: listReleasesMock,
  }),
}))

// Mock do facade de marketplace: o contexto PÚBLICO usa
// `useMarketplaceService().listListingReleases(listingId, { before })`.
const listListingReleasesMock = vi.fn()
vi.mock('@/services/marketplace', () => ({
  useMarketplaceService: () => ({
    listListingReleases: listListingReleasesMock,
  }),
}))

function makeRelease(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    clippingName: 'Meio Ambiente',
    articlesCount: 5,
    createdAt: '2025-01-15T10:00:00.000Z',
    releaseUrl: `https://example.com/releases/${id}`,
    ...overrides,
  }
}

describe('ReleaseList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no releases', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[]}
        hasMore={false}
      />,
    )

    expect(
      screen.getByText('Nenhuma edição publicada ainda'),
    ).toBeInTheDocument()
  })

  it('renders section title', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={false}
      />,
    )

    expect(screen.getByText('Edições')).toBeInTheDocument()
  })

  it('renders release list with formatted date and article count', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[
          makeRelease('r1', {
            createdAt: '2025-03-10T10:00:00.000Z',
            articlesCount: 12,
          }),
        ]}
        hasMore={false}
      />,
    )

    expect(screen.getByText(/10 de março de 2025/)).toBeInTheDocument()
    expect(screen.getByText(/12 artigos/)).toBeInTheDocument()
  })

  it('renders external links for each release', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={false}
      />,
    )

    const link = screen.getByRole('link', { name: /janeiro de 2025/i })
    expect(link).toHaveAttribute('href', 'https://example.com/releases/r1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows "Ver mais" button when hasMore is true', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={true}
      />,
    )

    expect(
      screen.getByRole('button', { name: /Ver mais/i }),
    ).toBeInTheDocument()
  })

  it('does not show "Ver mais" button when hasMore is false', () => {
    render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={false}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /Ver mais/i }),
    ).not.toBeInTheDocument()
  })

  describe('contexto público (facade marketplace)', () => {
    it('carrega mais edições do listing via facade ao clicar "Ver mais" (sem REST)', async () => {
      listListingReleasesMock.mockResolvedValueOnce({
        releases: [
          makeRelease('r2', {
            createdAt: '2025-02-20T10:00:00.000Z',
            refTime: null,
            sinceHours: null,
          }),
        ],
        hasMore: false,
      })

      const { user } = render(
        <ReleaseList
          listingId="listing-1"
          initialReleases={[
            makeRelease('r1', { createdAt: '2025-03-10T10:00:00.000Z' }),
          ]}
          hasMore={true}
        />,
      )

      await user.click(screen.getByRole('button', { name: /Ver mais/i }))

      // Usa o facade público com cursor `before` (createdAt da mais antiga).
      await waitFor(() => {
        expect(listListingReleasesMock).toHaveBeenCalledWith('listing-1', {
          before: '2025-03-10T10:00:00.000Z',
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/20 de fevereiro de 2025/)).toBeInTheDocument()
      })
      // REST nunca é tocado.
      expect(mockFetch).not.toHaveBeenCalled()

      // Botão some após a última página.
      expect(
        screen.queryByRole('button', { name: /Ver mais/i }),
      ).not.toBeInTheDocument()
    })

    it('pagina por cursor em cargas subsequentes (avança o before)', async () => {
      listListingReleasesMock
        .mockResolvedValueOnce({
          releases: [
            makeRelease('r2', {
              createdAt: '2025-02-20T10:00:00.000Z',
              refTime: null,
            }),
          ],
          hasMore: true,
        })
        .mockResolvedValueOnce({
          releases: [
            makeRelease('r3', {
              createdAt: '2025-01-10T10:00:00.000Z',
              refTime: null,
            }),
          ],
          hasMore: false,
        })

      const { user } = render(
        <ReleaseList
          listingId="listing-1"
          initialReleases={[
            makeRelease('r1', { createdAt: '2025-03-10T10:00:00.000Z' }),
          ]}
          hasMore={true}
        />,
      )

      // Primeira carga: cursor = createdAt da r1.
      await user.click(screen.getByRole('button', { name: /Ver mais/i }))
      await waitFor(() => {
        expect(listListingReleasesMock).toHaveBeenNthCalledWith(
          1,
          'listing-1',
          {
            before: '2025-03-10T10:00:00.000Z',
          },
        )
      })

      // Segunda carga: cursor avança para o createdAt da r2 (mais antiga agora).
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Ver mais/i }),
        ).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /Ver mais/i }))
      await waitFor(() => {
        expect(listListingReleasesMock).toHaveBeenNthCalledWith(
          2,
          'listing-1',
          {
            before: '2025-02-20T10:00:00.000Z',
          },
        )
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('contexto do autor (facade GraphQL)', () => {
    it('carrega mais edições via facade quando clippingId é fornecido (sem REST)', async () => {
      listReleasesMock.mockResolvedValueOnce({
        releases: [
          {
            id: 'r2',
            clippingName: 'Meio Ambiente',
            articlesCount: 7,
            createdAt: '2025-02-20T10:00:00.000Z',
            releaseUrl: 'https://example.com/releases/r2',
            refTime: null,
            sinceHours: null,
          },
        ],
        hasMore: false,
      })

      const { user } = render(
        <ReleaseList
          listingId=""
          clippingId="clip-1"
          initialReleases={[
            makeRelease('r1', { createdAt: '2025-03-10T10:00:00.000Z' }),
          ]}
          hasMore={true}
        />,
      )

      await user.click(screen.getByRole('button', { name: /Ver mais/i }))

      // Usa o facade com cursor `before` (createdAt da release mais antiga).
      await waitFor(() => {
        expect(listReleasesMock).toHaveBeenCalledWith('clip-1', {
          before: '2025-03-10T10:00:00.000Z',
        })
      })

      // Nova edição renderiza e o REST não é tocado.
      await waitFor(() => {
        expect(screen.getByText(/20 de fevereiro de 2025/)).toBeInTheDocument()
      })
      expect(mockFetch).not.toHaveBeenCalled()

      // Botão some após a última página.
      expect(
        screen.queryByRole('button', { name: /Ver mais/i }),
      ).not.toBeInTheDocument()
    })

    it('usa refTime como cursor quando presente', async () => {
      listReleasesMock.mockResolvedValueOnce({
        releases: [],
        hasMore: false,
      })

      const { user } = render(
        <ReleaseList
          listingId=""
          clippingId="clip-1"
          initialReleases={[
            makeRelease('r1', {
              createdAt: '2025-03-10T10:00:00.000Z',
              refTime: '2025-03-09T06:00:00.000Z',
            }),
          ]}
          hasMore={true}
        />,
      )

      await user.click(screen.getByRole('button', { name: /Ver mais/i }))

      await waitFor(() => {
        expect(listReleasesMock).toHaveBeenCalledWith('clip-1', {
          before: '2025-03-09T06:00:00.000Z',
        })
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
