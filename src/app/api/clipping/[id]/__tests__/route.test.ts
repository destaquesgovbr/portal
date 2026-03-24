import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetDoc = vi.fn()
const mockCollection = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockCollectionGroup = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      update: mockBatchUpdate,
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
    collectionGroup: mockCollectionGroup,
  })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/estimate-recorte-count', () => ({
  estimateTotalCount: vi
    .fn()
    .mockResolvedValue({ total: 50, perRecorte: [50] }),
  MAX_DAILY_ARTICLES: 100,
}))

vi.mock('@/lib/cron-utils', () => ({
  isValidCron: vi.fn((expr: string) => {
    try {
      return expr.trim().split(/\s+/).length === 5
    } catch {
      return false
    }
  }),
  calculateNextRun: vi.fn(() => new Date('2026-03-22T09:00:00.000Z')),
}))

import { auth } from '@/auth'
import { DELETE, PUT } from '../route'

const mockAuth = vi.mocked(auth)

// Build a deep Firestore chain: collection().doc().collection().doc()
function makeDocChain(exists: boolean, data: object = {}) {
  const innerDocRef = {
    get: mockGetDoc.mockResolvedValue({ exists, data: () => data }),
    update: mockUpdate,
    delete: mockDelete,
  }
  const innerCollectionRef = {
    doc: vi.fn().mockReturnValue(innerDocRef),
  }
  const outerDocRef = {
    collection: vi.fn().mockReturnValue(innerCollectionRef),
  }
  const outerCollectionRef = {
    doc: vi.fn().mockReturnValue(outerDocRef),
  }
  mockCollection.mockReturnValue(outerCollectionRef)
  return innerDocRef
}

// Helper to build a marketplace listing doc ref
function makeMarketplaceListingRef() {
  const listingDocRef = { update: vi.fn(), delete: vi.fn() }
  // When mockCollection is called with 'marketplace', return chain
  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') {
      return { doc: vi.fn().mockReturnValue(listingDocRef) }
    }
    // Default: users collection chain
    const innerDocRef = {
      get: mockGetDoc,
      update: mockUpdate,
      delete: mockDelete,
    }
    const innerCollectionRef = {
      doc: vi.fn().mockReturnValue(innerDocRef),
    }
    const outerDocRef = {
      collection: vi.fn().mockReturnValue(innerCollectionRef),
    }
    return { doc: vi.fn().mockReturnValue(outerDocRef) }
  })
  return listingDocRef
}

describe('PUT /api/clipping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validPayload = {
    name: 'Updated Clipping',
    recortes: [
      {
        id: 'rec-1',
        title: 'Saúde Pública',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Updated prompt',
    schedule: '0 9 * * *',
    deliveryChannels: { email: false, telegram: true, push: false },
    active: true,
  }

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('updates clipping owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, { name: 'Old Clipping' })
    mockUpdate.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe('clip-1')
    expect(body.name).toBe('Updated Clipping')
  })

  it('cascades update to marketplace listing when published', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const listingDocRef = makeMarketplaceListingRef()
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Old Clipping',
        publishedToMarketplace: true,
        marketplaceListingId: 'listing-123',
      }),
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    expect(mockBatchCommit).toHaveBeenCalled()
    // Should have two batch.update calls: one for clipping, one for listing
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        name: 'Updated Clipping',
        prompt: 'Updated prompt',
      }),
    )
  })

  it('does NOT touch marketplace when clipping is not published', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, { name: 'Old Clipping', publishedToMarketplace: false })
    mockUpdate.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    // Only one batch.update for the clipping itself, none for marketplace
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1)
  })

  it('returns 404 for clipping not owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(false)

    const request = new NextRequest(
      'http://localhost/api/clipping/other-clip',
      {
        method: 'PUT',
        body: JSON.stringify(validPayload),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'other-clip' }),
    })
    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/clipping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('deletes clipping owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, { name: 'My Clipping' })
    mockDelete.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })

  it('deactivates marketplace listing when deleting published clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const listingDocRef = makeMarketplaceListingRef()
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Published Clipping',
        publishedToMarketplace: true,
        marketplaceListingId: 'listing-456',
      }),
    })
    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    expect(mockBatchCommit).toHaveBeenCalled()
    // batch.update for listing (active:false) + batch.update for source (publishedToMarketplace:false) + batch.delete for clipping
    expect(mockBatchUpdate).toHaveBeenCalledWith(listingDocRef, {
      active: false,
    })
    expect(mockBatchDelete).toHaveBeenCalledTimes(1)
  })

  it('does NOT query collectionGroup for followers when deleting published clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeMarketplaceListingRef()
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Published Clipping',
        publishedToMarketplace: true,
        marketplaceListingId: 'listing-789',
      }),
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    // Should NOT use collectionGroup — followers are now in marketplace subcollection
    expect(mockCollectionGroup).not.toHaveBeenCalled()
  })

  it('deletes non-published clipping without marketplace cascade', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, {
      name: 'Simple Clipping',
      publishedToMarketplace: false,
    })
    mockDelete.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    expect(mockCollectionGroup).not.toHaveBeenCalled()
    expect(mockBatchDelete).toHaveBeenCalledTimes(1)
  })

  it('returns 404 for clipping not owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(false)

    const request = new NextRequest(
      'http://localhost/api/clipping/other-clip',
      {
        method: 'DELETE',
      },
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'other-clip' }),
    })
    expect(response.status).toBe(404)
  })
})
