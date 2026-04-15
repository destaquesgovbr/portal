import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCollection = vi.fn()
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
    doc: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs, empty: docs.length === 0 }),
    count: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
    }),
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
      authorUserId: 'user-1',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const clippingsChain = makeCollectionChain([
      { id: 'clip-1', data: () => clippingData },
    ])
    const subscriptionsChain = makeCollectionChain([])

    mockCollection.mockImplementation((name: string) => {
      if (name === 'clippings') return clippingsChain
      if (name === 'subscriptions') return subscriptionsChain
      return clippingsChain
    })

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

    const clippingsChain = makeCollectionChain([])
    const subscriptionsChain = makeCollectionChain([])

    mockCollection.mockImplementation((name: string) => {
      if (name === 'clippings') return clippingsChain
      if (name === 'subscriptions') return subscriptionsChain
      return clippingsChain
    })

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('merges subscription data into clipping response', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const clippingData = {
      name: 'My Clipping',
      authorUserId: 'user-1',
    }

    const subscriptionData = {
      clippingId: 'clip-1',
      deliveryChannels: { email: true, telegram: false, push: false },
      extraEmails: ['test@example.com'],
      webhookUrl: '',
    }

    const clippingsChain = makeCollectionChain([
      { id: 'clip-1', data: () => clippingData },
    ])
    const subscriptionsChain = makeCollectionChain([
      { id: 'sub-1', data: () => subscriptionData },
    ])

    mockCollection.mockImplementation((name: string) => {
      if (name === 'clippings') return clippingsChain
      if (name === 'subscriptions') return subscriptionsChain
      return clippingsChain
    })

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].subscriptionId).toBe('sub-1')
    expect(body[0].deliveryChannels.email).toBe(true)
    expect(body[0].extraEmails).toEqual(['test@example.com'])
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
        title: 'Saude',
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

  it('creates clipping in top-level collection and subscription', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const clippingsRef = {
      doc: vi.fn().mockReturnValue({ id: 'new-clip-id' }),
      where: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
      }),
    }
    const subscriptionsRef = {
      doc: vi.fn().mockReturnValue({ id: 'new-sub-id' }),
    }
    const usersRef = {
      doc: vi.fn().mockReturnThis(),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'clippings') return clippingsRef
      if (name === 'subscriptions') return subscriptionsRef
      if (name === 'users') return usersRef
      return clippingsRef
    })

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBe('new-clip-id')
    expect(body.subscriptionId).toBe('new-sub-id')
    expect(body.name).toBe('Test Clipping')

    // Verify batch.set was called 3 times: user, clipping, subscription
    expect(mockBatchSet).toHaveBeenCalledTimes(3)

    // Verify clipping has authorUserId
    const clippingSetCall = mockBatchSet.mock.calls.find(
      (call: unknown[]) =>
        call[1] &&
        typeof call[1] === 'object' &&
        'authorUserId' in (call[1] as Record<string, unknown>),
    )
    expect(clippingSetCall).toBeDefined()
    const clippingData = clippingSetCall![1] as Record<string, unknown>
    expect(clippingData.authorUserId).toBe('user-1')

    // Verify subscription has role='author'
    const subSetCall = mockBatchSet.mock.calls.find(
      (call: unknown[]) =>
        call[1] &&
        typeof call[1] === 'object' &&
        'role' in (call[1] as Record<string, unknown>),
    )
    expect(subSetCall).toBeDefined()
    const subData = subSetCall![1] as Record<string, unknown>
    expect(subData.role).toBe('author')
    expect(subData.clippingId).toBe('new-clip-id')
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

  it('saves nextRunAt as Date object (not string) for Firestore Timestamp', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const clippingsRef = {
      doc: vi.fn().mockReturnValue({ id: 'new-clip-id' }),
      where: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
      }),
    }
    const subscriptionsRef = {
      doc: vi.fn().mockReturnValue({ id: 'new-sub-id' }),
    }
    const usersRef = {
      doc: vi.fn().mockReturnThis(),
    }

    mockCollection.mockImplementation((name: string) => {
      if (name === 'clippings') return clippingsRef
      if (name === 'subscriptions') return subscriptionsRef
      if (name === 'users') return usersRef
      return clippingsRef
    })

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    const setCall = mockBatchSet.mock.calls.find(
      (call: unknown[]) =>
        call[1] &&
        typeof call[1] === 'object' &&
        'nextRunAt' in (call[1] as Record<string, unknown>),
    )
    expect(setCall).toBeDefined()
    const savedData = setCall![1] as Record<string, unknown>
    expect(savedData.nextRunAt).toBeInstanceOf(Date)
    expect(typeof savedData.nextRunAt).not.toBe('string')
  })

  it('does not enforce clipping limit (MAX_CLIPPINGS=0)', async () => {
    // The clipping limit was disabled (MAX_CLIPPINGS=0). This test ensures
    // users with many existing clippings can still create new ones.
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest('http://localhost/api/clipping', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
