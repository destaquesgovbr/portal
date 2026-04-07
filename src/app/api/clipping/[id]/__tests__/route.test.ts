import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDoc = vi.fn()
const mockCollection = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      update: mockBatchUpdate,
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
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

function makeDocChain(exists: boolean, data: object = {}) {
  const docRef = {
    get: mockGetDoc.mockResolvedValue({ exists, data: () => data }),
  }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(docRef),
  }
  const subscriptionsCollection = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    }),
  }
  mockCollection.mockImplementation((name: string) => {
    if (name === 'clippings') return clippingsCollection
    if (name === 'subscriptions') return subscriptionsCollection
    return clippingsCollection
  })
  return { docRef, subscriptionsCollection }
}

function makeDocChainWithSubscription(exists: boolean, data: object = {}) {
  const docRef = {
    get: mockGetDoc.mockResolvedValue({ exists, data: () => data }),
  }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(docRef),
  }
  const subRef = { id: 'sub-1' }
  const subscriptionsCollection = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: false,
      docs: [{ ref: subRef, id: 'sub-1', data: () => ({}) }],
    }),
  }
  mockCollection.mockImplementation((name: string) => {
    if (name === 'clippings') return clippingsCollection
    if (name === 'subscriptions') return subscriptionsCollection
    return clippingsCollection
  })
  return { docRef, subRef, subscriptionsCollection }
}

function makeMarketplaceChain(exists: boolean, data: object = {}) {
  const docRef = {
    get: mockGetDoc.mockResolvedValue({ exists, data: () => data }),
  }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(docRef),
  }
  const subRef = { id: 'sub-1' }
  const subscriptionsCollection = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: false,
      docs: [{ ref: subRef, id: 'sub-1', data: () => ({}) }],
    }),
  }
  const listingDocRef = { id: 'listing-123' }
  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }
  mockCollection.mockImplementation((name: string) => {
    if (name === 'clippings') return clippingsCollection
    if (name === 'subscriptions') return subscriptionsCollection
    if (name === 'marketplace') return marketplaceCollection
    return clippingsCollection
  })
  return { docRef, subRef, listingDocRef, subscriptionsCollection }
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
        title: 'Saude Publica',
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
    makeDocChainWithSubscription(true, {
      name: 'Old Clipping',
      authorUserId: 'user-1',
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
    const body = await response.json()
    expect(body.id).toBe('clip-1')
    expect(body.name).toBe('Updated Clipping')
  })

  it('updates subscription with delivery channels', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { subRef } = makeDocChainWithSubscription(true, {
      name: 'Old Clipping',
      authorUserId: 'user-1',
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    await PUT(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      subRef,
      expect.objectContaining({
        deliveryChannels: {
          email: false,
          telegram: true,
          push: false,
          webhook: false,
        },
      }),
    )
  })

  it('saves nextRunAt as Date object (not string) for Firestore Timestamp', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChainWithSubscription(true, {
      name: 'Old Clipping',
      authorUserId: 'user-1',
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    await PUT(request, { params: Promise.resolve({ id: 'clip-1' }) })

    const updateCall = mockBatchUpdate.mock.calls.find(
      (call: unknown[]) =>
        call[1] &&
        typeof call[1] === 'object' &&
        'nextRunAt' in (call[1] as Record<string, unknown>),
    )
    expect(updateCall).toBeDefined()
    const savedData = updateCall![1] as Record<string, unknown>
    expect(savedData.nextRunAt).toBeInstanceOf(Date)
    expect(typeof savedData.nextRunAt).not.toBe('string')
  })

  it('cascades update to marketplace listing when published', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = makeMarketplaceChain(true, {
      name: 'Old Clipping',
      authorUserId: 'user-1',
      publishedToMarketplace: true,
      marketplaceListingId: 'listing-123',
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
    // Should have 3 batch.update calls: clipping, subscription, listing
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3)
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
    makeDocChainWithSubscription(true, {
      name: 'Old Clipping',
      authorUserId: 'user-1',
      publishedToMarketplace: false,
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
    // 2 batch.update calls: clipping + subscription, none for marketplace
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
  })

  it('returns 404 for clipping not found', async () => {
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

  it('returns 404 for clipping not owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, { name: 'Other Clipping', authorUserId: 'user-2' })

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

  it('deletes clipping and its author subscription', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { docRef, subRef } = makeDocChainWithSubscription(true, {
      name: 'My Clipping',
      authorUserId: 'user-1',
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(mockBatchDelete).toHaveBeenCalledWith(subRef)
    expect(mockBatchDelete).toHaveBeenCalledWith(docRef)
  })

  it('deactivates marketplace listing when deleting published clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = makeMarketplaceChain(true, {
      name: 'Published Clipping',
      authorUserId: 'user-1',
      publishedToMarketplace: true,
      marketplaceListingId: 'listing-456',
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    expect(mockBatchCommit).toHaveBeenCalled()
    expect(mockBatchUpdate).toHaveBeenCalledWith(listingDocRef, {
      active: false,
    })
  })

  it('deletes non-published clipping without marketplace cascade', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChainWithSubscription(true, {
      name: 'Simple Clipping',
      authorUserId: 'user-1',
      publishedToMarketplace: false,
    })

    const request = new NextRequest('http://localhost/api/clipping/clip-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clip-1' }),
    })
    expect(response.status).toBe(200)
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 for clipping not found', async () => {
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

  it('returns 404 for clipping not owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocChain(true, { name: 'Other Clipping', authorUserId: 'user-2' })

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
