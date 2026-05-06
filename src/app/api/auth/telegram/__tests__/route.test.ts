import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockCollection = vi.fn()
const _mockDoc = vi.fn()
const mockRedirect = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
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

function makeTokenDocChain(exists: boolean, data: object = {}) {
  const docRef = {
    get: mockGet.mockResolvedValue({ exists, data: () => data }),
  }
  const collectionRef = {
    doc: vi.fn().mockReturnValue(docRef),
  }
  mockCollection.mockReturnValue(collectionRef)
  return docRef
}

describe('GET /api/auth/telegram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to signin if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram?state=abc123',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/signin'),
    )
  })

  it('includes callbackUrl with state in redirect when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram?state=mytoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('mytoken'),
    )
  })

  it('returns 400 if state param is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const request = new NextRequest('http://localhost/api/auth/telegram')

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 if token not found in Firestore', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    makeTokenDocChain(false)

    const request = new NextRequest(
      'http://localhost/api/auth/telegram?state=nonexistent',
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 if token is expired', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const expiredTimeMs = Date.now() - 3600 * 1000
    makeTokenDocChain(true, { expiresAtMs: expiredTimeMs, chatId: '12345' })

    const request = new NextRequest(
      'http://localhost/api/auth/telegram?state=expiredtoken',
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('redirects to callback when token is valid', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)

    const futureTimeMs = Date.now() + 3600 * 1000
    makeTokenDocChain(true, { expiresAtMs: futureTimeMs, chatId: '12345' })

    const request = new NextRequest(
      'http://localhost/api/auth/telegram?state=validtoken',
    )

    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/telegram/callback'),
    )
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('validtoken'),
    )
  })
})
