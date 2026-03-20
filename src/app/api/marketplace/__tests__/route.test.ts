import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockOrderBy = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockOffset = vi.fn()
const mockCountGet = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

import { GET } from '../route'

function makeChain(docs: { id: string; data: () => object }[], total: number) {
  const chain = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs }),
    count: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: () => ({ count: total }) }),
    }),
  }
  return chain
}

function makeRequest(url = 'http://localhost/api/marketplace') {
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no listings', async () => {
    const chain = makeChain([], 0)
    mockCollection.mockReturnValue(chain)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.listings).toEqual([])
    expect(body.total).toBe(0)
  })

  it('returns only active listings (skips inactive)', async () => {
    const chain = makeChain(
      [
        {
          id: 'listing-1',
          data: () => ({
            name: 'Active Listing',
            active: true,
            publishedAt: '2024-01-01',
          }),
        },
      ],
      1,
    )
    mockCollection.mockReturnValue(chain)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.listings).toHaveLength(1)
    expect(body.listings[0].id).toBe('listing-1')

    // Verify that where('active', '==', true) was called
    expect(chain.where).toHaveBeenCalledWith('active', '==', true)
  })

  it('returns listings sorted by publishedAt desc (default)', async () => {
    const chain = makeChain(
      [
        {
          id: 'listing-2',
          data: () => ({
            name: 'Newer',
            publishedAt: '2024-02-01',
            active: true,
          }),
        },
        {
          id: 'listing-1',
          data: () => ({
            name: 'Older',
            publishedAt: '2024-01-01',
            active: true,
          }),
        },
      ],
      2,
    )
    mockCollection.mockReturnValue(chain)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.listings).toHaveLength(2)
    expect(body.listings[0].id).toBe('listing-2')

    expect(chain.orderBy).toHaveBeenCalledWith('publishedAt', 'desc')
  })

  it('supports pagination with ?page=1&limit=12 (default limit=12)', async () => {
    const chain = makeChain(
      [
        {
          id: 'listing-1',
          data: () => ({ name: 'Listing', active: true }),
        },
      ],
      25,
    )
    mockCollection.mockReturnValue(chain)

    const response = await GET(
      makeRequest('http://localhost/api/marketplace?page=2&limit=5'),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.total).toBe(25)

    // page 2, limit 5 => offset 5
    expect(chain.limit).toHaveBeenCalledWith(5)
    expect(chain.offset).toHaveBeenCalledWith(5)
  })

  it('uses default limit=12 and page=1 when not specified', async () => {
    const chain = makeChain([], 0)
    mockCollection.mockReturnValue(chain)

    await GET(makeRequest())

    expect(chain.limit).toHaveBeenCalledWith(12)
    expect(chain.offset).toHaveBeenCalledWith(0)
  })

  it('does NOT require authentication', async () => {
    const chain = makeChain([], 0)
    mockCollection.mockReturnValue(chain)

    // No auth mock needed — should work without auth
    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
  })
})
