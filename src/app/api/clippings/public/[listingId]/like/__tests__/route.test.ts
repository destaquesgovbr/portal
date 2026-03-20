import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const _mockGet = vi.fn()
const _mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockIncrement = vi.fn((n: number) => ({ __increment: n }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
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
import { POST } from '../route'

const mockAuth = vi.mocked(auth)

function makeRequest() {
  return new NextRequest(
    'http://localhost/api/clippings/public/listing-1/like',
    {
      method: 'POST',
    },
  )
}

const routeParams = { params: Promise.resolve({ listingId: 'listing-1' }) }

function setupFirestoreMocks(options: {
  listingExists?: boolean
  listingActive?: boolean
  likeCount?: number
  userHasLiked?: boolean
}) {
  const {
    listingExists = true,
    listingActive = true,
    likeCount = 5,
    userHasLiked = false,
  } = options

  const listingDocRef = {
    id: 'listing-1',
    get: vi.fn().mockResolvedValue({
      exists: listingExists,
      data: () => ({
        active: listingActive,
        likeCount,
      }),
    }),
    update: mockUpdate,
  }

  const likeDocRef = {
    get: vi.fn().mockResolvedValue({
      exists: userHasLiked,
    }),
    set: mockSet,
    delete: mockDelete,
  }

  const likesCollection = {
    doc: vi.fn().mockReturnValue(likeDocRef),
  }

  const listingDocWithSubs = {
    ...listingDocRef,
    collection: vi.fn().mockReturnValue(likesCollection),
  }

  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocWithSubs),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'marketplace') return marketplaceCollection
    return marketplaceCollection
  })

  return { listingDocRef: listingDocWithSubs, likeDocRef, likesCollection }
}

describe('POST /api/clippings/public/[listingId]/like', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)
    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(401)
  })

  it('returns 404 for non-existent listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ listingExists: false })
    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(404)
  })

  it('returns 404 for inactive listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ listingActive: false })
    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(404)
  })

  it('adds like when user has not liked yet', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { likeDocRef: _likeDocRef } = setupFirestoreMocks({
      userHasLiked: false,
      likeCount: 5,
    })

    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.liked).toBe(true)
    expect(body.likeCount).toBe(6)

    // Should create the like doc
    expect(mockSet).toHaveBeenCalled()
    // Should increment likeCount
    expect(mockUpdate).toHaveBeenCalledWith({
      likeCount: { __increment: 1 },
    })
  })

  it('removes like when user already liked', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { likeDocRef: _likeDocRef } = setupFirestoreMocks({
      userHasLiked: true,
      likeCount: 5,
    })

    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.liked).toBe(false)
    expect(body.likeCount).toBe(4)

    // Should delete the like doc
    expect(mockDelete).toHaveBeenCalled()
    // Should decrement likeCount
    expect(mockUpdate).toHaveBeenCalledWith({
      likeCount: { __increment: -1 },
    })
  })

  it('likeCount never goes below 0', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({
      userHasLiked: true,
      likeCount: 0,
    })

    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.liked).toBe(false)
    expect(body.likeCount).toBe(0)
  })
})
