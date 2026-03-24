import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
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

// Helper to set up Firestore mocks for the new follower subcollection model
function setupFirestoreMocks(options: {
  listingExists?: boolean
  listingActive?: boolean
  listingAuthorUserId?: string
  listingName?: string
  followerExists?: boolean
}) {
  const {
    listingExists = true,
    listingActive = true,
    listingAuthorUserId = 'other-user',
    listingName = 'Meio Ambiente News',
    followerExists = false,
  } = options

  // Follower doc ref (marketplace/{listingId}/followers/{userId})
  const followerDocRef = {
    id: 'user-1',
    get: vi.fn().mockResolvedValue({
      exists: followerExists,
      data: () =>
        followerExists
          ? {
              userId: 'user-1',
              deliveryChannels: { email: true, telegram: false, push: false },
              followedAt: 'SERVER_TIMESTAMP',
            }
          : undefined,
    }),
  }

  const followersCollection = {
    doc: vi.fn().mockReturnValue(followerDocRef),
  }

  // Listing doc ref
  const listingDocRef = {
    id: 'listing-1',
    get: vi.fn().mockResolvedValue({
      exists: listingExists,
      data: () => ({
        active: listingActive,
        authorUserId: listingAuthorUserId,
        name: listingName,
        followerCount: 1,
      }),
    }),
    collection: vi.fn().mockReturnValue(followersCollection),
  }

  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCollection
    return marketplaceCollection
  })

  return {
    listingDocRef,
    followerDocRef,
    followersCollection,
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
    expect(body.error).toMatch(/próprio|own/i)
  })

  it('returns 409 when user already follows this listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ followerExists: true })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(409)
  })

  it('creates follower doc in marketplace/{listingId}/followers/{userId}', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { followerDocRef, listingDocRef } = setupFirestoreMocks({})

    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(201)

    // Verify batch.set was called for the follower doc
    expect(mockBatchSet).toHaveBeenCalledWith(
      followerDocRef,
      expect.objectContaining({
        userId: 'user-1',
        deliveryChannels: {
          email: true,
          telegram: false,
          push: false,
        },
        followedAt: 'SERVER_TIMESTAMP',
      }),
    )

    // Verify followerCount increment on listing
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        followerCount: { __increment: 1 },
      }),
    )

    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('increments followerCount on the listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = setupFirestoreMocks({})

    await POST(makeRequest(validPayload), routeParams)

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        followerCount: { __increment: 1 },
      }),
    )
  })

  it('does NOT check MAX_CLIPPINGS limit', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({})

    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(201)

    // The users collection should not be accessed at all
    // (no clipping count check)
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
    setupFirestoreMocks({ followerExists: false })
    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(404)
  })

  it('deletes the follower doc from subcollection', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { followerDocRef } = setupFirestoreMocks({ followerExists: true })

    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(200)
    expect(mockBatchDelete).toHaveBeenCalledWith(followerDocRef)
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('decrements followerCount on the listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = setupFirestoreMocks({ followerExists: true })

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
