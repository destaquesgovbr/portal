import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('admin', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
  })

  describe('isAdmin', () => {
    it('returns true when user has admin role from Keycloak/Firestore', async () => {
      process.env.ADMIN_EMAILS = ''
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: ['admin'],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(true)
    })

    it('returns true when user has admin among multiple roles', async () => {
      process.env.ADMIN_EMAILS = ''
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: ['admin', 'viewer'],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(true)
    })

    it('returns true when user email is in ADMIN_EMAILS (fallback)', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,other@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: [],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(true)
    })

    it('returns false when user has no admin role and not in ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'User',
          email: 'user@example.com',
          roles: [],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(false)
    })

    it('returns false when not authenticated', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue(null)

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(false)
    })

    it('returns false when ADMIN_EMAILS is empty and no roles', async () => {
      process.env.ADMIN_EMAILS = ''
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'User',
          email: 'admin@example.com',
          roles: [],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(false)
    })

    it('trims whitespace from ADMIN_EMAILS list', async () => {
      process.env.ADMIN_EMAILS = '  admin@example.com , other@example.com  '
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: [],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(true)
    })

    it('prioritizes roles over ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = 'other@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: ['admin'],
        },
        expires: '',
      })

      const { isAdmin } = await import('../admin')
      expect(await isAdmin()).toBe(true)
    })
  })

  describe('requireAdmin', () => {
    it('resolves when user has admin role', async () => {
      process.env.ADMIN_EMAILS = ''
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: ['admin'],
        },
        expires: '',
      })

      const { requireAdmin } = await import('../admin')
      await expect(requireAdmin()).resolves.not.toThrow()
    })

    it('resolves when user is in ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: [],
        },
        expires: '',
      })

      const { requireAdmin } = await import('../admin')
      await expect(requireAdmin()).resolves.not.toThrow()
    })

    it('throws when user is not admin', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com'
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '1',
          name: 'User',
          email: 'user@example.com',
          roles: [],
        },
        expires: '',
      })

      const { requireAdmin } = await import('../admin')
      await expect(requireAdmin()).rejects.toThrow('Unauthorized')
    })
  })
})
