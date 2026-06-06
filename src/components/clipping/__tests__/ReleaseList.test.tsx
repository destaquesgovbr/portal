import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { ReleaseList } from '../ReleaseList'

// Mock fetch globally (caminho REST público legado)
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock do facade de clipping: o contexto do AUTOR usa
// `useClippingService().listReleases(clippingId, { before })` em vez de REST.
const listReleasesMock = vi.fn()
vi.mock('@/services/clipping', () => ({
  useClippingService: () => ({
    listReleases: listReleasesMock,
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

  it('fetches more releases on "Ver mais" click', async () => {
    const newRelease = makeRelease('r2', {
      createdAt: '2025-02-20T10:00:00.000Z',
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        releases: [newRelease],
        hasMore: false,
      }),
    })

    const { user } = render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={true}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Ver mais/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/clippings/public/listing-1/releases?page=2',
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/20 de fevereiro de 2025/)).toBeInTheDocument()
    })

    // Button should be hidden after last page
    expect(
      screen.queryByRole('button', { name: /Ver mais/i }),
    ).not.toBeInTheDocument()
  })

  it('appends releases and increments page on subsequent loads', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [makeRelease('r2')],
          hasMore: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [makeRelease('r3')],
          hasMore: false,
        }),
      })

    const { user } = render(
      <ReleaseList
        listingId="listing-1"
        initialReleases={[makeRelease('r1')]}
        hasMore={true}
      />,
    )

    // First load more
    await user.click(screen.getByRole('button', { name: /Ver mais/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/clippings/public/listing-1/releases?page=2',
      )
    })

    // Second load more
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Ver mais/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Ver mais/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/clippings/public/listing-1/releases?page=3',
      )
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
