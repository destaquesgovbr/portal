import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const mockDocGet = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockOffset = vi.fn()
const mockLimit = vi.fn()
const mockQueryGet = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

import { GET } from '../route'

function makeParams(listingId: string) {
  return { params: Promise.resolve({ listingId }) }
}

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    authorUserId: 'author-1',
    sourceClippingId: 'clip-1',
    name: 'Meio Ambiente',
    active: true,
    ...overrides,
  }
}

function makeRelease(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      clippingId: 'clip-1',
      userId: 'author-1',
      clippingName: 'Meio Ambiente',
      digest: 'Resumo da edição',
      digestHtml: '<p>Resumo da edição</p>',
      articlesCount: 5,
      createdAt: { toDate: () => new Date('2025-01-15T10:00:00Z') },
      releaseUrl: `https://example.com/releases/${id}`,
      ...overrides,
    }),
  }
}

function setupMocks(
  listingData: Record<string, unknown> | null,
  listingExists: boolean,
  releaseDocs: ReturnType<typeof makeRelease>[] = [],
) {
  const listingDocRef = {
    get: vi.fn().mockResolvedValue({
      exists: listingExists,
      data: () => listingData,
      id: 'listing-1',
    }),
  }

  const marketplaceCol = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  // Chain for releases query
  mockQueryGet.mockResolvedValue({ docs: releaseDocs })
  mockLimit.mockReturnValue({ get: mockQueryGet })
  mockOffset.mockReturnValue({ limit: mockLimit })
  mockOrderBy.mockReturnValue({ offset: mockOffset })
  mockWhere.mockReturnValue({ orderBy: mockOrderBy })

  const releasesCol = {
    where: mockWhere,
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCol
    if (name === 'releases') return releasesCol
    return marketplaceCol
  })

  return { listingDocRef, marketplaceCol }
}

describe('GET /api/clippings/public/[listingId]/releases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for non-existent listing', async () => {
    setupMocks(null, false)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/nonexistent/releases',
      ),
      makeParams('nonexistent'),
    )
    expect(response.status).toBe(404)
  })

  it('returns 404 for inactive listing', async () => {
    setupMocks(makeListing({ active: false }), true)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(404)
  })

  it('returns releases paginated with default limit=10, page=1', async () => {
    const releases = Array.from({ length: 3 }, (_, i) =>
      makeRelease(`release-${i + 1}`),
    )
    setupMocks(makeListing(), true, releases)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.releases).toHaveLength(3)
    expect(body.hasMore).toBe(false)

    // Verify query was called with correct params
    expect(mockWhere).toHaveBeenCalledWith('clippingId', '==', 'clip-1')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(mockOffset).toHaveBeenCalledWith(0) // page 1, offset 0
    expect(mockLimit).toHaveBeenCalledWith(11) // limit + 1 to detect hasMore
  })

  it('returns hasMore=true when there are more releases', async () => {
    // Return 11 docs (limit + 1) to indicate more exist
    const releases = Array.from({ length: 11 }, (_, i) =>
      makeRelease(`release-${i + 1}`),
    )
    setupMocks(makeListing(), true, releases)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.releases).toHaveLength(10) // Only 10, not 11
    expect(body.hasMore).toBe(true)
  })

  it('returns hasMore=false on last page', async () => {
    const releases = Array.from({ length: 5 }, (_, i) =>
      makeRelease(`release-${i + 1}`),
    )
    setupMocks(makeListing(), true, releases)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases?page=2',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.releases).toHaveLength(5)
    expect(body.hasMore).toBe(false)

    // Page 2 with default limit 10 => offset 10
    expect(mockOffset).toHaveBeenCalledWith(10)
  })

  it('returns empty list when no releases', async () => {
    setupMocks(makeListing(), true, [])

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.releases).toHaveLength(0)
    expect(body.hasMore).toBe(false)
  })

  it('converts Firestore Timestamps to ISO strings', async () => {
    const releases = [makeRelease('release-1')]
    setupMocks(makeListing(), true, releases)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases',
      ),
      makeParams('listing-1'),
    )
    const body = await response.json()

    expect(body.releases[0].createdAt).toBe('2025-01-15T10:00:00.000Z')
    expect(body.releases[0].id).toBe('release-1')
  })

  it('respects custom page and limit params', async () => {
    const releases = Array.from({ length: 5 }, (_, i) =>
      makeRelease(`release-${i + 1}`),
    )
    setupMocks(makeListing(), true, releases)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases?page=3&limit=5',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    // Page 3 with limit 5 => offset 10
    expect(mockOffset).toHaveBeenCalledWith(10)
    expect(mockLimit).toHaveBeenCalledWith(6) // limit + 1
  })

  it('caps limit at 50', async () => {
    setupMocks(makeListing(), true, [])

    await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/releases?limit=100',
      ),
      makeParams('listing-1'),
    )

    expect(mockLimit).toHaveBeenCalledWith(51) // 50 + 1
  })
})
