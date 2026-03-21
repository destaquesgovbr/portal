import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock firebase-admin
const _mockGet = vi.fn()
const mockAdd = vi.fn()
const _mockOrderBy = vi.fn()
const _mockLimit = vi.fn()
const _mockWhere = vi.fn()
const mockCollection = vi.fn()
const _mockDoc = vi.fn()
const _mockCount = vi.fn()
const _mockGetCount = vi.fn()

const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      set: mockBatchSet,
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
  calculateNextRun: vi.fn(() => new Date('2026-03-22T08:00:00.000Z')),
}))

import { auth } from '@/auth'
import { GET, POST } from '../route'

const mockAuth = vi.mocked(auth)

function makeCollectionChain(docs: { id: string; data: () => object }[]) {
  const chain = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs }),
    add: mockAdd,
    count: vi.fn().mockReturnThis(),
  }
  return chain
}

describe('GET /api/clipping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)

    const response = await GET()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns clippings for authenticated user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const clippingData = {
      name: 'My Clipping',
      recortes: [],
      prompt: '',
      schedule: '0 8 * * *',
      deliveryChannels: { email: true, telegram: false, push: false },
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const chain = makeCollectionChain([
      { id: 'clip-1', data: () => clippingData },
    ])
    mockCollection.mockReturnValue(chain)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('clip-1')
    expect(body[0].name).toBe('My Clipping')
  })

  it('returns empty array when no clippings', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const chain = makeCollectionChain([])
    mockCollection.mockReturnValue(chain)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })
})

describe('POST /api/clipping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validPayload = {
    name: 'Test Clipping',
    recortes: [
      {
        id: 'rec-1',
        title: 'Saúde',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Summarize the news',
    schedule: '0 8 * * *',
    deliveryChannels: { email: true, telegram: false, push: false },
    active: true,
  }

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('creates clipping with valid payload', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const newDocRef = { id: 'new-clip-id' }
    mockAdd.mockResolvedValue(newDocRef)

    const clippingsRef = {
      doc: vi.fn().mockReturnValue({ id: 'new-clip-id' }),
      count: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
      }),
    }
    const userDocRef = {
      collection: vi.fn().mockReturnValue(clippingsRef),
    }
    const usersCollectionRef = {
      doc: vi.fn().mockReturnValue(userDocRef),
    }
    mockCollection.mockReturnValue(usersCollectionRef)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBe('new-clip-id')
    expect(body.name).toBe('Test Clipping')
  })

  it('returns 400 for missing name', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 for empty recortes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, recortes: [] }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid schedule', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, schedule: 'not a cron' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('enforces max 10 clippings per user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const chain = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ size: 10 }),
      add: mockAdd,
      count: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: () => ({ count: 10 }) }),
      }),
    }
    mockCollection.mockReturnValue(chain)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/limit|máximo|max/i)
  })
})
