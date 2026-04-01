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

vi.mock('@/lib/invite', () => ({
  generateInviteCode: () => 'TEST1234',
}))

describe('convites actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('getUserInvites', () => {
    it('returns user profile and invite codes', async () => {
      const userDocRef = createMockDocRef(
        createMockDocSnapshot('user-1', {
          inviteCount: 2,
          role: 'user',
          joinedAt: '2026-01-01T00:00:00Z',
        }),
      )

      const inviteCodesCollection = createMockCollectionRef()
      inviteCodesCollection.get = vi.fn().mockResolvedValue({
        docs: [
          createMockDocSnapshot('CODE0001', {
            code: 'CODE0001',
            createdBy: 'user-1',
            createdAt: '2026-01-01T00:00:00Z',
            status: 'active',
            usedBy: null,
            usedAt: null,
          }),
          createMockDocSnapshot('CODE0002', {
            code: 'CODE0002',
            createdBy: 'user-1',
            createdAt: '2026-01-02T00:00:00Z',
            status: 'used',
            usedBy: 'user-2',
            usedAt: '2026-01-03T00:00:00Z',
          }),
        ],
        empty: false,
      })

      const usersCollection = createMockCollectionRef({
        'user-1': userDocRef,
      })

      const mockDb = createMockFirestoreDb({
        users: usersCollection,
        inviteCodes: inviteCodesCollection,
      })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
        expires: '',
      })

      const { getUserInvites } = await import('../actions')
      const result = await getUserInvites()

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.data.inviteCount).toBe(2)
        expect(result.data.codes).toHaveLength(2)
      }
    })

    it('returns error when not authenticated', async () => {
      const mockDb = createMockFirestoreDb()
      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { getUserInvites } = await import('../actions')
      const result = await getUserInvites()

      expect(result.type).toBe('err')
    })
  })

  describe('createInviteCode', () => {
    it('creates invite code when under limit', async () => {
      const userDocRef = createMockDocRef(
        createMockDocSnapshot('user-1', {
          inviteCount: 3,
          role: 'user',
        }),
      )

      const inviteCodesCollection = createMockCollectionRef()
      const usersCollection = createMockCollectionRef({
        'user-1': userDocRef,
      })

      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const mockDb = createMockFirestoreDb({
        users: usersCollection,
        inviteCodes: inviteCodesCollection,
      })
      mockDb.batch = vi.fn().mockReturnValue(mockBatch)

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
        expires: '',
      })

      const { createInviteCode } = await import('../actions')
      const result = await createInviteCode()

      expect(result.type).toBe('ok')
      expect(mockBatch.set).toHaveBeenCalledTimes(2)
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('returns error when invite limit reached', async () => {
      const userDocRef = createMockDocRef(
        createMockDocSnapshot('user-1', {
          inviteCount: 5,
          role: 'user',
        }),
      )

      const usersCollection = createMockCollectionRef({
        'user-1': userDocRef,
      })

      const mockDb = createMockFirestoreDb({ users: usersCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
        expires: '',
      })

      const { createInviteCode } = await import('../actions')
      const result = await createInviteCode()

      expect(result.type).toBe('err')
    })

    it('returns error when not authenticated', async () => {
      const mockDb = createMockFirestoreDb()
      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { createInviteCode } = await import('../actions')
      const result = await createInviteCode()

      expect(result.type).toBe('err')
    })
  })

  describe('revokeInviteCode', () => {
    it('revokes an active code owned by the user', async () => {
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('MYCODE01', {
          code: 'MYCODE01',
          createdBy: 'user-1',
          status: 'active',
        }),
      )

      const inviteCodesCollection = createMockCollectionRef({
        MYCODE01: inviteDocRef,
      })
      const mockDb = createMockFirestoreDb({
        inviteCodes: inviteCodesCollection,
      })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
        expires: '',
      })

      const { revokeInviteCode } = await import('../actions')
      const result = await revokeInviteCode('MYCODE01')

      expect(result.type).toBe('ok')
      expect(inviteDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'revoked' }),
      )
    })

    it('returns error when code is not owned by user', async () => {
      const inviteDocRef = createMockDocRef(
        createMockDocSnapshot('OTHER001', {
          code: 'OTHER001',
          createdBy: 'other-user',
          status: 'active',
        }),
      )

      const inviteCodesCollection = createMockCollectionRef({
        OTHER001: inviteDocRef,
      })
      const mockDb = createMockFirestoreDb({
        inviteCodes: inviteCodesCollection,
      })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { auth } = await import('@/auth')
      ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
        expires: '',
      })

      const { revokeInviteCode } = await import('../actions')
      const result = await revokeInviteCode('OTHER001')

      expect(result.type).toBe('err')
    })
  })
})
