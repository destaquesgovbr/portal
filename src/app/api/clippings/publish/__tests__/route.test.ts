import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Firestore
const _mockGet = vi.fn()
const mockSet = vi.fn()
const _mockUpdate = vi.fn()
const _mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const _mockWhere = vi.fn()
const _mockLimit = vi.fn()

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

import { auth } from '@/auth'
import { POST } from '../route'

const mockAuth = vi.mocked(auth)

const validPayload = {
  clippingId: 'clip-1',
  description: 'Um clipping sobre meio ambiente',
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/clippings/publish', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockClippingDoc(data: Record<string, unknown> | null, exists = true) {
  const clippingRef = {
    get: vi.fn().mockResolvedValue({
      exists,
      data: () => data,
      ref: { parent: { parent: { id: 'user-1' } } },
    }),
    id: 'clip-1',
  }
  const clippingsCollection = {
    doc: vi.fn().mockReturnValue(clippingRef),
  }
  const userDoc = {
    collection: vi.fn().mockReturnValue(clippingsCollection),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ email: 'user@example.com' }),
    }),
  }
  const usersCollection = {
    doc: vi.fn().mockReturnValue(userDoc),
  }

  const marketplaceDoc = {
    id: 'listing-1',
    set: mockSet,
  }
  const marketplaceCollection = {
    doc: vi.fn().mockReturnValue(marketplaceDoc),
  }

  mockCollection.mockImplementation((name: string) => {
    if (name === 'users') return usersCollection
    if (name === 'marketplace') return marketplaceCollection
    return usersCollection
  })

  return { clippingRef, userDoc, marketplaceDoc }
}

describe('POST /api/clippings/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(401)
  })

  it('returns 400 when description is empty', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com' },
    } as never)
    const response = await POST(
      makeRequest({ ...validPayload, description: '' }),
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 when recorte has no title', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com' },
    } as never)
    mockClippingDoc({
      name: 'Meio Ambiente',
      description: 'Um clipping sobre meio ambiente',
      recortes: [{ id: 'r1', themes: ['08'], agencies: [], keywords: [] }],
      prompt: '',
    })
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(400)
  })

  it('returns 404 when clipping does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com' },
    } as never)
    mockClippingDoc(null, false)
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(404)
  })

  it('returns 400 when clipping is already published', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com' },
    } as never)
    mockClippingDoc({
      name: 'Meio Ambiente',
      description: 'Um clipping sobre meio ambiente',
      recortes: [
        {
          id: 'r1',
          title: 'Políticas ambientais',
          themes: ['08'],
          agencies: [],
          keywords: [],
        },
      ],
      prompt: '',
      publishedToMarketplace: true,
      marketplaceListingId: 'existing-listing',
    })
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(409)
  })

  it('returns 400 when clipping is a follow', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com' },
    } as never)
    mockClippingDoc({
      name: 'Meio Ambiente',
      description: 'Um clipping sobre meio ambiente',
      recortes: [
        {
          id: 'r1',
          title: 'Políticas ambientais',
          themes: ['08'],
          agencies: [],
          keywords: [],
        },
      ],
      prompt: '',
      followsListingId: 'some-listing',
    })
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(400)
  })

  it('publishes clipping successfully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'u@e.com', name: 'Nitai' },
    } as never)
    mockClippingDoc({
      name: 'Meio Ambiente',
      description: 'Um clipping sobre meio ambiente',
      recortes: [
        {
          id: 'r1',
          title: 'Políticas ambientais',
          themes: ['08'],
          agencies: [],
          keywords: [],
        },
      ],
      prompt: 'Summarize',
    })
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.listingId).toBeDefined()
    expect(mockBatchSet).toHaveBeenCalled()
    expect(mockBatchCommit).toHaveBeenCalled()
  })
})
