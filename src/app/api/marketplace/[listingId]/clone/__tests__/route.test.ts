import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const mockCollection = vi.fn()
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockIncrement = vi.fn((n: number) => ({ __increment: n }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
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
import { POST } from '../route'

const mockAuth = vi.mocked(auth)

function makeRequest() {
  return new NextRequest('http://localhost/api/marketplace/listing-1/clone', {
    method: 'POST',
  })
}

const routeParams = { params: Promise.resolve({ listingId: 'listing-1' }) }

function setupFirestoreMocks(options: {
  listingExists?: boolean
  listingActive?: boolean
  listingData?: Record<string, unknown>
  clippingCount?: number
}) {
  const {
    listingExists = true,
    listingActive = true,
    clippingCount = 0,
    listingData = {},
  } = options

  const defaultListingData = {
    active: listingActive,
    name: 'Meio Ambiente News',
    description: 'Notícias sobre meio ambiente',
    recortes: [
      {
        id: 'r1',
        title: 'Políticas ambientais',
        themes: ['08'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Resuma as notícias ambientais',
    likeCount: 5,
    followerCount: 3,
    cloneCount: 2,
    ...listingData,
  }

  const listingDocRef = {
    id: 'listing-1',
    get: vi.fn().mockResolvedValue({
      exists: listingExists,
      data: () => defaultListingData,
    }),
  }

  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(listingDocRef),
  }

  // User's clippings subcollection
  const newClippingRef = { id: 'new-clipping-1' }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(newClippingRef),
    count: vi.fn().mockReturnValue({
      get: vi
        .fn()
        .mockResolvedValue({ data: () => ({ count: clippingCount }) }),
    }),
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
    return marketplaceCollection
  })

  return { listingDocRef, clippingsCollection, newClippingRef }
}

describe('POST /api/marketplace/[listingId]/clone', () => {
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

  it('returns 400 when user has 10 clippings (limit)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({ clippingCount: 10 })
    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/limit|máximo|max/i)
  })

  it('creates independent clipping copy with correct data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { newClippingRef, listingDocRef: _listingDocRef } =
      setupFirestoreMocks({})

    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.id).toBe('new-clipping-1')

    // Verify batch.set was called for the clipping
    expect(mockBatchSet).toHaveBeenCalledWith(
      newClippingRef,
      expect.objectContaining({
        name: 'Meio Ambiente News',
        description: 'Notícias sobre meio ambiente',
        recortes: [
          {
            id: 'r1',
            title: 'Políticas ambientais',
            themes: ['08'],
            agencies: [],
            keywords: [],
          },
        ],
        prompt: 'Resuma as notícias ambientais',
        clonedFrom: 'listing-1',
        active: false,
        scheduleTime: '08:00',
        deliveryChannels: { email: false, telegram: false, push: false },
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      }),
    )

    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('increments cloneCount on listing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { listingDocRef } = setupFirestoreMocks({})

    await POST(makeRequest(), routeParams)

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      listingDocRef,
      expect.objectContaining({
        cloneCount: { __increment: 1 },
      }),
    )
  })

  it('returns 201 with the created clipping', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreMocks({})

    const response = await POST(makeRequest(), routeParams)
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.id).toBe('new-clipping-1')
  })
})
