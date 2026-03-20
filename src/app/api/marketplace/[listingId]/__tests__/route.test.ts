import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const _mockGet = vi.fn()
const mockCollection = vi.fn()
const mockCollectionGroup = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    collectionGroup: mockCollectionGroup,
    batch: vi.fn(() => ({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })),
  })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'
import { DELETE, GET } from '../route'

const mockAuth = vi.mocked(auth)

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
    recortes: [
      {
        id: 'r1',
        title: 'Políticas ambientais',
        themes: ['08'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Resuma as notícias',
    likeCount: 5,
    followerCount: 3,
    cloneCount: 1,
    publishedAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    active: true,
    ...overrides,
  }
}

function mockListingDoc(data: Record<string, unknown> | null, exists = true) {
  const listingDocRef = {
    get: vi.fn().mockResolvedValue({
      exists,
      data: () => data,
      id: 'listing-1',
    }),
    update: vi.fn().mockResolvedValue(undefined),
    id: 'listing-1',
  }

  const marketplaceCol = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCol
    return marketplaceCol
  })

  return { listingDocRef, marketplaceCol }
}

// ---------- GET /api/marketplace/[listingId] ----------

describe('GET /api/marketplace/[listingId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns listing detail for valid listingId', async () => {
    const data = makeListing()
    mockListingDoc(data)

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/listing-1'),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe('listing-1')
    expect(body.name).toBe('Meio Ambiente')
    expect(body.recortes).toHaveLength(1)
    expect(body.recortes[0].title).toBe('Políticas ambientais')
  })

  it('returns 404 for non-existent listing', async () => {
    mockListingDoc(null, false)

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/nonexistent'),
      makeParams('nonexistent'),
    )
    expect(response.status).toBe(404)
  })

  it('returns 404 for inactive listing', async () => {
    mockListingDoc(makeListing({ active: false }))

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/listing-1'),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(404)
  })

  it('includes recortes with titles', async () => {
    const data = makeListing({
      recortes: [
        {
          id: 'r1',
          title: 'Saúde Pública',
          themes: ['05'],
          agencies: [],
          keywords: [],
        },
        {
          id: 'r2',
          title: 'Educação',
          themes: ['06'],
          agencies: [],
          keywords: [],
        },
      ],
    })
    mockListingDoc(data)

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/listing-1'),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.recortes).toHaveLength(2)
    expect(body.recortes[0].title).toBe('Saúde Pública')
    expect(body.recortes[1].title).toBe('Educação')
  })

  it('does NOT require authentication', async () => {
    mockListingDoc(makeListing())
    // No auth mock — should still work
    mockAuth.mockResolvedValue(null as never)

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/listing-1'),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
  })

  it('if user is authenticated, includes userHasLiked and userFollowsId', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-2' },
    } as never)

    const data = makeListing()
    const listingDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => data,
        id: 'listing-1',
      }),
      id: 'listing-1',
    }

    // Mock the like doc
    const likeDocRef = {
      get: vi.fn().mockResolvedValue({ exists: true }),
    }

    // Mock the follow query
    const _followQuery = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: 'follow-clip-1' }],
      }),
    }

    const marketplaceCol = {
      doc: vi.fn().mockImplementation((id: string) => {
        if (id === 'listing-1') return listingDocRef
        return listingDocRef
      }),
    }

    const likesCol = {
      doc: vi.fn().mockReturnValue(likeDocRef),
    }

    // For the likes subcollection: marketplace/listing-1/likes/user-2
    const listingWithLikes = {
      ...listingDocRef,
      collection: vi.fn().mockReturnValue(likesCol),
    }
    marketplaceCol.doc = vi.fn().mockReturnValue(listingWithLikes)

    // Clippings subcollection for follows
    const clippingsCol = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: 'follow-clip-1' }],
      }),
    }

    const userDoc = {
      collection: vi.fn().mockReturnValue(clippingsCol),
    }

    const usersCol = {
      doc: vi.fn().mockReturnValue(userDoc),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCol
      if (name === 'users') return usersCol
      return marketplaceCol
    })

    const response = await GET(
      new NextRequest('http://localhost/api/marketplace/listing-1'),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.userHasLiked).toBe(true)
    expect(body.userFollowsId).toBe('follow-clip-1')
  })
})

// ---------- DELETE /api/marketplace/[listingId] ----------

describe('DELETE /api/marketplace/[listingId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const response = await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(401)
  })

  it('returns 403 for non-author', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'other-user' },
    } as never)

    const data = makeListing({ authorUserId: 'author-1' })
    mockListingDoc(data)

    const response = await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(403)
  })

  it('returns 404 for non-existent listing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'author-1' },
    } as never)

    mockListingDoc(null, false)

    const response = await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(404)
  })

  it('removes listing (sets active: false)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'author-1' },
    } as never)

    const data = makeListing({ authorUserId: 'author-1' })
    const listingDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => data,
        id: 'listing-1',
      }),
      update: vi.fn().mockResolvedValue(undefined),
      id: 'listing-1',
    }

    const marketplaceCol = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    // Source clipping ref
    const sourceClippingRef = {
      update: vi.fn().mockResolvedValue(undefined),
    }
    const clippingsCol = {
      doc: vi.fn().mockReturnValue(sourceClippingRef),
    }
    const userDoc = {
      collection: vi.fn().mockReturnValue(clippingsCol),
    }
    const usersCol = {
      doc: vi.fn().mockReturnValue(userDoc),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCol
      if (name === 'users') return usersCol
      return marketplaceCol
    })

    // Mock collectionGroup for follower clippings
    const followerDocs = [
      { ref: { update: vi.fn() }, id: 'follower-1' },
      { ref: { update: vi.fn() }, id: 'follower-2' },
    ]
    mockCollectionGroup.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: followerDocs }),
    })

    const response = await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )
    expect(response.status).toBe(200)

    // Listing should be deactivated
    expect(mockBatchUpdate).toHaveBeenCalled()
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('deactivates all follower clippings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'author-1' },
    } as never)

    const data = makeListing({ authorUserId: 'author-1' })
    const listingDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => data,
        id: 'listing-1',
      }),
      update: vi.fn().mockResolvedValue(undefined),
      id: 'listing-1',
    }

    const marketplaceCol = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    const sourceClippingRef = {
      update: vi.fn().mockResolvedValue(undefined),
    }
    const clippingsCol = {
      doc: vi.fn().mockReturnValue(sourceClippingRef),
    }
    const userDoc = {
      collection: vi.fn().mockReturnValue(clippingsCol),
    }
    const usersCol = {
      doc: vi.fn().mockReturnValue(userDoc),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCol
      if (name === 'users') return usersCol
      return marketplaceCol
    })

    const followerRef1 = { update: vi.fn() }
    const followerRef2 = { update: vi.fn() }
    const followerDocs = [
      { ref: followerRef1, id: 'f1' },
      { ref: followerRef2, id: 'f2' },
    ]

    mockCollectionGroup.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: followerDocs }),
    })

    await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )

    // collectionGroup('clippings').where('followsListingId', '==', 'listing-1')
    expect(mockCollectionGroup).toHaveBeenCalledWith('clippings')

    // Each follower clipping should be deactivated via batch
    // listing ref + source clipping ref + 2 follower refs = 4 batch updates
    expect(mockBatchUpdate).toHaveBeenCalledTimes(4)
  })

  it('updates source clipping: publishedToMarketplace false, marketplaceListingId null', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'author-1' },
    } as never)

    const data = makeListing({
      authorUserId: 'author-1',
      sourceClippingId: 'clip-1',
    })
    const listingDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => data,
        id: 'listing-1',
      }),
      update: vi.fn().mockResolvedValue(undefined),
      id: 'listing-1',
    }

    const marketplaceCol = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    const sourceClippingRef = {
      update: vi.fn().mockResolvedValue(undefined),
    }
    const clippingsCol = {
      doc: vi.fn().mockReturnValue(sourceClippingRef),
    }
    const userDoc = {
      collection: vi.fn().mockReturnValue(clippingsCol),
    }
    const usersCol = {
      doc: vi.fn().mockReturnValue(userDoc),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCol
      if (name === 'users') return usersCol
      return marketplaceCol
    })

    mockCollectionGroup.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [] }),
    })

    await DELETE(
      new NextRequest('http://localhost/api/marketplace/listing-1', {
        method: 'DELETE',
      }),
      makeParams('listing-1'),
    )

    // Source clipping should be updated in batch
    expect(mockBatchUpdate).toHaveBeenCalledWith(sourceClippingRef, {
      publishedToMarketplace: false,
      marketplaceListingId: null,
    })
  })
})
