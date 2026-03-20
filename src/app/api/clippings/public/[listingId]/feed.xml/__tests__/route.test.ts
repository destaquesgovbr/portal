import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()

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
    authorDisplayName: 'Author',
    sourceClippingId: 'clip-1',
    name: 'Meio Ambiente',
    description: 'Notícias ambientais',
    recortes: [],
    prompt: 'Resuma',
    likeCount: 0,
    followerCount: 0,
    cloneCount: 0,
    publishedAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    active: true,
    ...overrides,
  }
}

function makeRelease(overrides: Record<string, unknown> = {}) {
  return {
    id: 'release-1',
    clippingId: 'clip-1',
    userId: 'author-1',
    clippingName: 'Meio Ambiente',
    digest: 'Resumo do dia',
    digestHtml: '<p>Resumo do dia</p>',
    articlesCount: 5,
    createdAt: '2024-06-15T08:00:00.000Z',
    releaseUrl: 'https://example.com/releases/release-1',
    ...overrides,
  }
}

function setupMocks(
  listingData: Record<string, unknown> | null,
  exists: boolean,
  releaseDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [],
) {
  const listingDocRef = {
    get: vi.fn().mockResolvedValue({
      exists,
      data: () => listingData,
      id: 'listing-1',
    }),
  }

  const releasesQuery = {
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: vi.fn().mockResolvedValue({ docs: releaseDocs }),
  }

  mockWhere.mockReturnValue(releasesQuery)
  mockOrderBy.mockReturnValue(releasesQuery)
  mockLimit.mockReturnValue(releasesQuery)

  const marketplaceCol = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCol
    if (name === 'releases') return releasesQuery
    return marketplaceCol
  })
}

describe('GET /api/clippings/public/[listingId]/feed.xml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for non-existent listing', async () => {
    setupMocks(null, false)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/nonexistent/feed.xml',
      ),
      makeParams('nonexistent'),
    )
    expect(response.status).toBe(404)
  })

  it('returns 404 for inactive listing', async () => {
    setupMocks(makeListing({ active: false }), true)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/feed.xml',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(404)
  })

  it('returns RSS with correct content-type', async () => {
    setupMocks(makeListing(), true)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/feed.xml',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/rss+xml; charset=utf-8',
    )
  })

  it('returns feed with releases', async () => {
    const release = makeRelease()
    setupMocks(makeListing(), true, [{ id: 'release-1', data: () => release }])

    const response = await GET(
      new NextRequest(
        'http://localhost/api/clippings/public/listing-1/feed.xml',
      ),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('<title>Meio Ambiente</title>')
    expect(body).toContain('https://example.com/releases/release-1')
    expect(body).toContain('Resumo do dia')
  })
})
