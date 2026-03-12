import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDelete = vi.fn()
const mockCommit = vi.fn()
const mockCollection = vi.fn()
const mockRedirect = vi.fn()

const mockBatch = {
  set: mockSet,
  delete: mockDelete,
  commit: mockCommit.mockResolvedValue(undefined),
}

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => mockBatch),
  })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { auth } from '@/auth'
import { GET } from '../route'

const mockAuth = vi.mocked(auth)

function makeDocRef(exists: boolean, data: object = {}) {
  const docRef = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
  docRef.get.mockResolvedValue({ exists, data: () => data })

  const collRef = {
    doc: vi.fn().mockReturnValue({
      ...docRef,
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(docRef),
      }),
    }),
  }

  mockCollection.mockReturnValue(collRef)
  return docRef
}

function validTokenData(chatId = '31949381') {
  return {
    expiresAt: { toDate: () => new Date(Date.now() + 600_000) },
    chatId,
    userId: null,
  }
}

function expiredTokenData(chatId = '31949381') {
  return {
    expiresAt: { toDate: () => new Date(Date.now() - 600_000) },
    chatId,
    userId: null,
  }
}

describe('GET /api/auth/telegram/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCommit.mockResolvedValue(undefined)
  })

  it('redirects to signin if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=abc123',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/api/auth/signin')
  })

  it('returns 400 if state param is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback',
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('state')
  })

  it('returns 400 if token not found in Firestore', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(false)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=nonexistent',
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 if token is expired', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, expiredTokenData())

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=expired',
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('commits batch and redirects to success on valid token', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, validTokenData())

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockCommit).toHaveBeenCalledOnce()
    expect(mockRedirect).toHaveBeenCalledWith('/auth/telegram/success')
  })

  it('batch includes user telegramLink, reverse-lookup, and token delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, validTokenData('99999'))

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')

    // 2 set calls (user link + reverse-lookup) + 1 delete (token)
    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockCommit).toHaveBeenCalledOnce()
  })

  it('batch set includes chatId in user telegramLink', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, validTokenData('55555'))

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')

    const firstSetData = mockSet.mock.calls[0][1]
    expect(firstSetData).toMatchObject({ chatId: '55555' })
  })

  it('batch set includes userId in reverse-lookup', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-42' } } as never)
    makeDocRef(true, validTokenData())

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')

    const secondSetData = mockSet.mock.calls[1][1]
    expect(secondSetData).toMatchObject({ userId: 'user-42' })
  })

  it('returns 500 if batch commit fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, validTokenData())
    mockCommit.mockRejectedValue(new Error('Firestore unavailable'))

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    const response = await GET(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('does not redirect on batch commit failure', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeDocRef(true, validTokenData())
    mockCommit.mockRejectedValue(new Error('Firestore unavailable'))

    const request = new NextRequest(
      'http://localhost/api/auth/telegram/callback?state=validtoken',
    )

    await GET(request)
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
