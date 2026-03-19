import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/admin', () => ({ isAdmin: vi.fn() }))
vi.mock('@/lib/firebase-admin', () => ({ getFirestoreDb: vi.fn() }))

class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT:${url}`)
    this.url = url
  }
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

async function expectRedirect(fn: () => Promise<void>, url: string) {
  try {
    await fn()
    throw new Error('Expected redirect but none occurred')
  } catch (error) {
    expect(error).toBeInstanceOf(RedirectError)
    expect((error as RedirectError).url).toBe(url)
  }
}

describe('PostLoginPage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('redirects to /convite when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValue(null)

    const { default: PostLoginPage } = await import('../page')
    await expectRedirect(() => PostLoginPage(), '/convite')
  })

  it('redirects to / when user has existing Firestore profile', async () => {
    const { auth } = await import('@/auth')
    const { getFirestoreDb } = await import('@/lib/firebase-admin')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', name: 'Test', email: 'test@example.com' },
      expires: '',
    })

    const mockGet = vi.fn().mockResolvedValue({ exists: true })
    vi.mocked(getFirestoreDb).mockReturnValue({
      collection: () => ({ doc: () => ({ get: mockGet }) }),
    } as never)

    const { default: PostLoginPage } = await import('../page')
    await expectRedirect(() => PostLoginPage(), '/')
  })

  it('creates profile and redirects to / when user is admin without profile', async () => {
    const { auth } = await import('@/auth')
    const { isAdmin } = await import('@/lib/admin')
    const { getFirestoreDb } = await import('@/lib/firebase-admin')

    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'admin-123',
        name: 'Admin',
        email: 'admin@example.com',
        roles: ['admin'],
      },
      expires: '',
    })
    vi.mocked(isAdmin).mockResolvedValue(true)

    const mockSet = vi.fn().mockResolvedValue(undefined)
    const mockGet = vi.fn().mockResolvedValue({ exists: false })
    vi.mocked(getFirestoreDb).mockReturnValue({
      collection: () => ({ doc: () => ({ get: mockGet, set: mockSet }) }),
    } as never)

    const { default: PostLoginPage } = await import('../page')
    await expectRedirect(() => PostLoginPage(), '/')

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'admin',
        name: 'Admin',
        email: 'admin@example.com',
        invitedBy: null,
        inviteCode: null,
        inviteCount: 0,
      }),
    )
  })

  it('redirects to /convite when user has no profile and is not admin', async () => {
    const { auth } = await import('@/auth')
    const { isAdmin } = await import('@/lib/admin')
    const { getFirestoreDb } = await import('@/lib/firebase-admin')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-456', name: 'User', email: 'user@example.com' },
      expires: '',
    })
    vi.mocked(isAdmin).mockResolvedValue(false)

    const mockGet = vi.fn().mockResolvedValue({ exists: false })
    vi.mocked(getFirestoreDb).mockReturnValue({
      collection: () => ({ doc: () => ({ get: mockGet }) }),
    } as never)

    const { default: PostLoginPage } = await import('../page')
    await expectRedirect(() => PostLoginPage(), '/convite')
  })
})
