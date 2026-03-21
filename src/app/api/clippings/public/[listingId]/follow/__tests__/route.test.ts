import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const _mockGet = vi.fn()
const _mockDoc = vi.fn()
const mockCollection = vi.fn()
const _mockWhere = vi.fn()
const _mockLimit = vi.fn()
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

vi.mock('@/lib/cron-utils', () => ({
  isValidCron: vi.fn((expr: string) => {
    try {
      return expr.trim().split(/\s+/).length === 5
    } catch {
      return false
    }
  }),
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
  schedule: '0 8 * * *',
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

// Helper to set up Firestore mocks for the follow flow
function setupFirestoreMocks(options: {
  listingExists?: boolean
  listingActive?: boolean
  listingAuthorUserId?: string
  listingName?: string
  existingFollowDocs?: { id: string; data: () => Record<string, unknown> }[]
  clippingCount?: number
}) {
  const {
    listingExists = true,
    listingActive = true,
    listingAuthorUserId = 'other-user',
    listingName = 'Meio Ambiente News',
    existingFollowDocs = [],
    clippingCount = 0,
  } = options

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
  }
  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  // User's clippings subcollection
  const followerClippingRef = { id: 'follower-clip-1' }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(followerClippingRef),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: existingFollowDocs.length === 0,
      docs: existingFollowDocs,
    }),
    count: vi.fn().mockReturnValue({
      get: vi
        .fn()
        .mockResolvedValue({ data: () => ({ count: clippingCount }) }),
    }),
    limit: vi.fn().mockReturnThis(),
  }
  const userDocRef = {
    collection: vi.fn().mockReturnValue(clippingsCollection),
  }
  const usersCollection = {
    doc: vi.fn().mockReturnValue(userDocRef),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCollection
    if (name === 'users') return usersCollection
    return usersCollection
  })

  return {
    listingDocRef,
    clippingsCollection,
    followerClippingRef,
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

  it('returns 400 for invalid schedule', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const response = await POST(
      makeRequest({ ...validPayload, schedule: 'not a cron' }),
      routeParams,
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 for no delivery channel selected', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const response = await POST(
      makeRequest({
        ...validPayload,
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
    setupFirestoreMocks({
      existingFollowDocs: [
        {
          id: 'existing-follow',
          data: () => ({ followsListingId: 'listing-1' }),
        },
      ],
    })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(409)
  })

  it('returns 400 when user has 10 clippings (limit reached)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ clippingCount: 10 })
    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/limit|máximo|max/i)
  })

  it('creates follower clipping with correct data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { followerClippingRef, listingDocRef } = setupFirestoreMocks({})

    const response = await POST(makeRequest(validPayload), routeParams)
    expect(response.status).toBe(201)

    // Verify batch.set was called for the follower clipping
    expect(mockBatchSet).toHaveBeenCalledWith(
      followerClippingRef,
      expect.objectContaining({
        followsListingId: 'listing-1',
        followsAuthorUserId: 'other-user',
        schedule: '0 8 * * *',
        deliveryChannels: {
          email: true,
          telegram: false,
          push: false,
          webhook: false,
        },
        active: true,
        name: 'Meio Ambiente News',
        recortes: [],
        prompt: '',
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
    setupFirestoreMocks({ existingFollowDocs: [] })
    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(404)
  })

  it('deletes the follower clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const followerDocRef = { id: 'follower-clip-1' }
    setupFirestoreMocks({
      existingFollowDocs: [
        {
          id: 'follower-clip-1',
          data: () => ({ followsListingId: 'listing-1' }),
        },
      ],
    })

    // Override so the where().get() returns docs with ref
    const clippingsCollection = {
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'follower-clip-1',
            ref: followerDocRef,
            data: () => ({ followsListingId: 'listing-1' }),
          },
        ],
      }),
      limit: vi.fn().mockReturnThis(),
    }
    const userDocRef = {
      collection: vi.fn().mockReturnValue(clippingsCollection),
    }
    const usersCollection = { doc: vi.fn().mockReturnValue(userDocRef) }

    const listingDocRef = {
      id: 'listing-1',
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ followerCount: 3 }),
      }),
    }
    const marketplaceCollection = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCollection
      if (name === 'users') return usersCollection
      return usersCollection
    })

    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(200)
    expect(mockBatchDelete).toHaveBeenCalledWith(followerDocRef)
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('decrements followerCount (min 0)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const followerDocRef = { id: 'follower-clip-1' }
    const clippingsCollection = {
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'follower-clip-1',
            ref: followerDocRef,
            data: () => ({ followsListingId: 'listing-1' }),
          },
        ],
      }),
      limit: vi.fn().mockReturnThis(),
    }
    const userDocRef = {
      collection: vi.fn().mockReturnValue(clippingsCollection),
    }
    const usersCollection = { doc: vi.fn().mockReturnValue(userDocRef) }

    const listingDocRef = {
      id: 'listing-1',
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ followerCount: 2 }),
      }),
    }
    const marketplaceCollection = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCollection
      if (name === 'users') return usersCollection
      return usersCollection
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

  it('works even if listing was deleted (still removes local follower clipping)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const followerDocRef = { id: 'follower-clip-1' }
    const clippingsCollection = {
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'follower-clip-1',
            ref: followerDocRef,
            data: () => ({ followsListingId: 'listing-1' }),
          },
        ],
      }),
      limit: vi.fn().mockReturnThis(),
    }
    const userDocRef = {
      collection: vi.fn().mockReturnValue(clippingsCollection),
    }
    const usersCollection = { doc: vi.fn().mockReturnValue(userDocRef) }

    // Listing does NOT exist
    const listingDocRef = {
      id: 'listing-1',
      get: vi.fn().mockResolvedValue({ exists: false }),
    }
    const marketplaceCollection = {
      doc: vi.fn().mockReturnValue(listingDocRef),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'marketplace') return marketplaceCollection
      if (name === 'users') return usersCollection
      return usersCollection
    })

    const response = await DELETE(makeDeleteRequest(), routeParams)
    expect(response.status).toBe(200)

    // Should still delete the follower clipping
    expect(mockBatchDelete).toHaveBeenCalledWith(followerDocRef)
    expect(mockBatchCommit).toHaveBeenCalled()

    // Should NOT update listing since it doesn't exist
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })
})
