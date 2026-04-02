import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCollection = vi.fn()
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockIncrement = vi.fn((n: number) => ({ __increment: n }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (n: number) => mockIncrement(n),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

import { auth } from '@/auth'
import { DELETE, POST } from '../route'

const mockAuth = vi.mocked(auth)

const validPayload = {
  deliveryChannels: { email: true, telegram: false, push: false },
}

function makeRequest(body: unknown) {
  return new NextRequest(
    'http://localhost/api/clippings/public/listing-1/follow',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function makeDeleteRequest() {
  return new NextRequest(
    'http://localhost/api/clippings/public/listing-1/follow',
    {
      method: 'DELETE',
    },
  )
}

const routeParams = { params: Promise.resolve({ listingId: 'listing-1' }) }

function setupFirestoreMocks(options: {
  listingExists?: boolean
  listingActive?: boolean
  listingAuthorUserId?: string
  listingName?: string
  listingSourceClippingId?: string
  existingSubscription?: boolean
}) {
  const {
    listingExists = true,
    listingActive = true,
    listingAuthorUserId = 'other-user',
    listingName = 'Meio Ambiente News',
    listingSourceClippingId = 'clip-source-1',
    existingSubscription = false,
  } = options

  const listingDocRef = {
    id: 'listing-1',
    get: vi.fn().mockResolvedValue({
      exists: listingExists,
      data: () => ({
        active: listingActive,
        authorUserId: listingAuthorUserId,
        name: listingName,
        sourceClippingId: listingSourceClippingId,
        followerCount: 1,
      }),
    }),
  }

  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  const subscriptionRef = { id: 'new-sub-id' }
  const existingSubRef = { id: 'existing-sub-id' }

  const subscriptionsCollection = {
    doc: vi.fn().mockReturnValue(subscriptionRef),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: !existingSubscription,
      docs: existingSubscription
        ? [
            {
              id: 'existing-sub-id',
              ref: existingSubRef,
              data: () => ({
                clippingId: listingSourceClippingId,
                userId: 'user-1',
                role: 'subscriber',
              }),
            },
          ]
        : [],
    }),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCollection
    if (name === 'subscriptions') return subscriptionsCollection
    return marketplaceCollection
  })

  return {
    listingDocRef,
    subscriptionRef,
    existingSubRef,
    subscriptionsCollection,
    marketplaceCollection,
  }
}

describe('POST /api/clippings/public/[listingId]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(401)
  })

  it('returns 400 for no delivery channel selected', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const response = await POST(
      makeRequest({
        deliveryChannels: { email: false, telegram: false, push: false },
      }),
      routeParams,
    )
    expect(response.status).toBe(400)
  })

  it('returns 404 when listing does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ listingExists: false })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(404)
  })

  it('returns 404 when listing is inactive', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ listingActive: false })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(404)
  })

  it('returns 400 when user tries to follow their own clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ listingAuthorUserId: 'user-1' })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/pr.prio|own/i)
  })

  it('returns 409 when user already follows this listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ existingSubscription: true })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(409)
  })

  it('creates subscription in subscriptions collection', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { subscriptionRef, listingDocRef } = setupFirestoreMocks({})

    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(201)

    expect(mockBatchSet).toHaveBeenCalledWith(
      subscriptionRef,
      expect.objectContaining({
        clippingId: 'clip-source-1',
        userId: 'user-1',
        role: 'subscriber',
        deliveryChannels: {
          email: true,
          telegram: false,
          push: false,
          webhook: false,
        },
        extraEmails: [],
        webhookUrl: '',
        subscribedAt: 'SERVER_TIMESTAMP',
        active: true,
      }),
    )

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        followerCount: { __increment: 1 },
      }),
    )

    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('returns subscriptionId in response', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({})

    const response = await POST(makeRequest(validPayload), routeParams)
    const body = await response.json()
    expect(body.subscriptionId).toBe('new-sub-id')
  })
})

describe('DELETE /api/clippings/public/[listingId]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)
    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(401)
  })

  it('returns 404 when user does not follow this listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ existingSubscription: false })
    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(404)
  })

  it('deletes the subscription', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { existingSubRef } = setupFirestoreMocks({
      existingSubscription: true,
    })

    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(200)
    expect(mockBatchDelete).toHaveBeenCalledWith(existingSubRef)
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('decrements followerCount on the listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = setupFirestoreMocks({
      existingSubscription: true,
    })

    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(200)

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        followerCount: { __increment: -1 },
      }),
    )
  })
})
