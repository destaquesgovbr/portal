import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockOrderBy = vi.fn(() => ({ get: mockGet }))
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
import { getClippings } from '../page'

const mockAuth = vi.mocked(auth)

function setupFirestoreDocs(
  docs: { id: string; data: Record<string, unknown> }[],
) {
  mockCollection.mockReturnValue({
    doc: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        orderBy: mockOrderBy,
      }),
    }),
  })

  mockGet.mockResolvedValue({
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
  })
}

describe('getClippings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const result = await getClippings()
    expect(result).toEqual([])
  })

  it('returns empty array when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} } as never)

    const result = await getClippings()
    expect(result).toEqual([])
  })

  it('returns clippings for authenticated user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreDocs([
      {
        id: 'clip-1',
        data: {
          name: 'Meu Clipping',
          recortes: [],
          prompt: '',
          schedule: '0 8 * * *',
          deliveryChannels: { email: true, telegram: false, push: false },
          active: true,
          createdAt: { toDate: () => new Date('2026-03-12T10:00:00Z') },
          updatedAt: { toDate: () => new Date('2026-03-12T10:00:00Z') },
        },
      },
    ])

    const result = await getClippings()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('clip-1')
    expect(result[0].name).toBe('Meu Clipping')
  })

  it('serializes Firestore Timestamps to ISO strings', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreDocs([
      {
        id: 'clip-1',
        data: {
          name: 'Test',
          createdAt: { toDate: () => new Date('2026-01-15T08:30:00Z') },
          updatedAt: { toDate: () => new Date('2026-02-20T14:00:00Z') },
        },
      },
    ])

    const result = await getClippings()
    expect(result[0].createdAt).toBe('2026-01-15T08:30:00.000Z')
    expect(result[0].updatedAt).toBe('2026-02-20T14:00:00.000Z')
  })

  it('handles missing Timestamps gracefully (returns empty string)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreDocs([
      {
        id: 'clip-1',
        data: {
          name: 'No timestamps',
        },
      },
    ])

    const result = await getClippings()
    expect(result[0].createdAt).toBe('')
    expect(result[0].updatedAt).toBe('')
  })

  it('handles Timestamps without toDate method (returns empty string)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreDocs([
      {
        id: 'clip-1',
        data: {
          name: 'Raw timestamps',
          createdAt: { _seconds: 1710000000, _nanoseconds: 0 },
          updatedAt: { _seconds: 1710000000, _nanoseconds: 0 },
        },
      },
    ])

    const result = await getClippings()
    expect(result[0].createdAt).toBe('')
    expect(result[0].updatedAt).toBe('')
  })

  it('returns empty array on Firestore error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    mockCollection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          orderBy: vi.fn(() => ({
            get: vi.fn().mockRejectedValue(new Error('Firestore down')),
          })),
        }),
      }),
    })

    const result = await getClippings()
    expect(result).toEqual([])
  })

  it('queries the correct Firestore path', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-42' } } as never)
    setupFirestoreDocs([])

    await getClippings()

    expect(mockCollection).toHaveBeenCalledWith('users')
    const docCall = mockCollection.mock.results[0].value.doc
    expect(docCall).toHaveBeenCalledWith('user-42')
  })

  it('returns multiple clippings preserving order', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    setupFirestoreDocs([
      {
        id: 'clip-2',
        data: {
          name: 'Segundo',
          createdAt: { toDate: () => new Date('2026-03-12T10:00:00Z') },
          updatedAt: { toDate: () => new Date('2026-03-12T10:00:00Z') },
        },
      },
      {
        id: 'clip-1',
        data: {
          name: 'Primeiro',
          createdAt: { toDate: () => new Date('2026-03-11T10:00:00Z') },
          updatedAt: { toDate: () => new Date('2026-03-11T10:00:00Z') },
        },
      },
    ])

    const result = await getClippings()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('clip-2')
    expect(result[1].id).toBe('clip-1')
  })
})
