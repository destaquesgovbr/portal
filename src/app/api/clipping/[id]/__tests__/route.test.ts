import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
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

describe('PUT /api/clipping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validPayload = {
    name: 'Updated Clipping',
    recortes: [
      {
        id: 'rec-1',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Updated prompt',
    scheduleTime: '09:00',
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
