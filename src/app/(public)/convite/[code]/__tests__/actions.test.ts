import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockCollectionRef,
  createMockDocRef,
  createMockDocSnapshot,
  createMockFirestoreDb,
} from '@/__tests__/mocks/firebase-admin'

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('convite actions', () => {
  let mockDb: ReturnType<typeof createMockFirestoreDb>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('validateInviteCode', () => {
    it('returns invite data when code is active', async () => {
      const inviteData = {
        code: 'ABC12345',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
        usedBy: null,
        usedAt: null,
      }
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('ABC12345', inviteData),
      )
      const userDocRef = createMockDocRef(
        createMockDocSnapshot('user-1', { role: 'user' }),
      )
      const inviteCodesCollection = createMockCollectionRef({
        ABC12345: inviteDocRef,
      })
      const usersCollection = createMockCollectionRef({ 'user-1': userDocRef })
      mockDb = createMockFirestoreDb({
        inviteCodes: inviteCodesCollection,
        users: usersCollection,
      })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { validateInviteCode } = await import('../actions')
      const result = await validateInviteCode('ABC12345')

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.data.code).toBe('ABC12345')
        expect(result.data.status).toBe('active')
      }
    })

    it('returns error when code does not exist', async () => {
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('INVALID1', undefined),
      )
      const inviteCodesCollection = createMockCollectionRef({
        INVALID1: inviteDocRef,
      })
      mockDb = createMockFirestoreDb({ inviteCodes: inviteCodesCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { validateInviteCode } = await import('../actions')
      const result = await validateInviteCode('INVALID1')

      expect(result.type).toBe('err')
    })

    it('returns error when code is already used', async () => {
      const inviteData = {
        code: 'USED1234',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'used',
        usedBy: 'user-2',
        usedAt: '2026-01-02T00:00:00Z',
      }
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('USED1234', inviteData),
      )
      const inviteCodesCollection = createMockCollectionRef({
        USED1234: inviteDocRef,
      })
      mockDb = createMockFirestoreDb({ inviteCodes: inviteCodesCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { validateInviteCode } = await import('../actions')
      const result = await validateInviteCode('USED1234')

      expect(result.type).toBe('err')
    })

    it('returns error when code is revoked', async () => {
      const inviteData = {
        code: 'REVK1234',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'revoked',
        usedBy: null,
        usedAt: null,
      }
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('REVK1234', inviteData),
      )
      const inviteCodesCollection = createMockCollectionRef({
        REVK1234: inviteDocRef,
      })
      mockDb = createMockFirestoreDb({ inviteCodes: inviteCodesCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { validateInviteCode } = await import('../actions')
      const result = await validateInviteCode('REVK1234')

      expect(result.type).toBe('err')
    })
  })

  describe('redeemInviteCode', () => {
    it('marks code as used and creates user profile', async () => {
      const inviteData = {
        code: 'REDEEM01',
        createdBy: 'inviter-1',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
        usedBy: null,
        usedAt: null,
      }

      const transaction = {
        get: vi
          .fn()
          .mockResolvedValue(createMockDocSnapshot('REDEEM01', inviteData)),
        update: vi.fn(),
        set: vi.fn(),
      }

      const inviteDocRef = createMockDocRef()
      const userDocRef = createMockDocRef(
        createMockDocSnapshot('new-user', undefined),
      )
      const inviteCodesCollection = createMockCollectionRef({
        REDEEM01: inviteDocRef,
      })
      const usersCollection = createMockCollectionRef({
        'new-user': userDocRef,
      })
      mockDb = createMockFirestoreDb({
        inviteCodes: inviteCodesCollection,
        users: usersCollection,
      })
      mockDb.runTransaction = vi.fn(async (fn) => fn(transaction))

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'new-user', name: 'New User', email: 'new@example.com' },
        expires: '',
      })

      const { redeemInviteCode } = await import('../actions')
      const result = await redeemInviteCode('REDEEM01')

      expect(result.type).toBe('ok')
      expect(transaction.update).toHaveBeenCalled()
      expect(transaction.set).toHaveBeenCalled()
    })

    it('returns error when not authenticated', async () => {
      mockDb = createMockFirestoreDb()

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { redeemInviteCode } = await import('../actions')
      const result = await redeemInviteCode('REDEEM01')

      expect(result.type).toBe('err')
    })

    it('returns error when code is no longer active during transaction', async () => {
      const inviteData = {
        code: 'RACE0001',
        createdBy: 'inviter-1',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'used',
        usedBy: 'someone-else',
        usedAt: '2026-01-02T00:00:00Z',
      }

      const transaction = {
        get: vi
          .fn()
          .mockResolvedValue(createMockDocSnapshot('RACE0001', inviteData)),
        update: vi.fn(),
        set: vi.fn(),
      }

      const inviteDocRef = createMockDocRef()
      const inviteCodesCollection = createMockCollectionRef({
        RACE0001: inviteDocRef,
      })
      mockDb = createMockFirestoreDb({ inviteCodes: inviteCodesCollection })
      mockDb.runTransaction = vi.fn(async (fn) => fn(transaction))

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'new-user', name: 'New User', email: 'new@example.com' },
        expires: '',
      })

      const { redeemInviteCode } = await import('../actions')
      const result = await redeemInviteCode('RACE0001')

      expect(result.type).toBe('err')
      expect(transaction.update).not.toHaveBeenCalled()
    })
  })
})
