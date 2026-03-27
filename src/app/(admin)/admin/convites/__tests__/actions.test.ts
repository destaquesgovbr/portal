import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('admin convites actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function setupAdminAuth() {
    return import('@/auth').then(({ auth }) => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
          roles: ['admin'],
        },
        expires: '',
      })
    })
  }

  function setupNonAdminAuth() {
    return import('@/auth').then(({ auth }) => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'user-1',
          name: 'User',
          email: 'user@example.com',
          roles: [],
        },
        expires: '',
      })
    })
  }

  describe('getWaitlistEntries', () => {
    it('returns waitlist entries for admin', async () => {
      await setupAdminAuth()

      const waitlistCollection = createMockCollectionRef()
      waitlistCollection.get = vi.fn().mockResolvedValue({
        docs: [
          {
            id: 'entry-1',
            ...createMockDocSnapshot('entry-1', {
              email: 'user1@example.com',
              name: 'User 1',
              status: 'pending',
              submittedAt: '2026-01-01T00:00:00Z',
            }),
          },
        ],
        empty: false,
      })

      const mockDb = createMockFirestoreDb({ waitlist: waitlistCollection })
      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { getWaitlistEntries } = await import('../actions')
      const result = await getWaitlistEntries()

      expect(result.type).toBe('ok')
    })

    it('blocks non-admin users', async () => {
      await setupNonAdminAuth()

      const mockDb = createMockFirestoreDb()
      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { getWaitlistEntries } = await import('../actions')
      const result = await getWaitlistEntries()

      expect(result.type).toBe('unknown_err')
    })
  })

  describe('approveEntry', () => {
    it('approves waitlist entry and generates invite code', async () => {
      await setupAdminAuth()

      const entryDocRef = createMockDocRef(
        createMockDocSnapshot('entry-1', {
          email: 'user1@example.com',
          name: 'User 1',
          status: 'pending',
        }),
      )

      const waitlistCollection = createMockCollectionRef({
        'entry-1': entryDocRef,
      })
      const inviteCodesCollection = createMockCollectionRef()

      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const mockDb = createMockFirestoreDb({
        waitlist: waitlistCollection,
        inviteCodes: inviteCodesCollection,
      })
      mockDb.batch = vi.fn().mockReturnValue(mockBatch)

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { approveEntry } = await import('../actions')
      const result = await approveEntry('entry-1')

      expect(result.type).toBe('ok')
      expect(mockBatch.update).toHaveBeenCalled()
      expect(mockBatch.set).toHaveBeenCalled()
      expect(mockBatch.commit).toHaveBeenCalled()
    })
  })

  describe('rejectEntry', () => {
    it('rejects a waitlist entry', async () => {
      await setupAdminAuth()

      const entryDocRef = createMockDocRef(
        createMockDocSnapshot('entry-1', {
          email: 'user1@example.com',
          status: 'pending',
        }),
      )

      const waitlistCollection = createMockCollectionRef({
        'entry-1': entryDocRef,
      })
      const mockDb = createMockFirestoreDb({ waitlist: waitlistCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { rejectEntry } = await import('../actions')
      const result = await rejectEntry('entry-1')

      expect(result.type).toBe('ok')
      expect(entryDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected' }),
      )
    })
  })

  describe('getInviteStats', () => {
    it('returns aggregate stats for admin', async () => {
      await setupAdminAuth()

      const inviteCodesCollection = createMockCollectionRef()
      inviteCodesCollection.get = vi.fn().mockResolvedValue({
        docs: [
          createMockDocSnapshot('c1', { status: 'active' }),
          createMockDocSnapshot('c2', { status: 'used' }),
          createMockDocSnapshot('c3', { status: 'active' }),
        ],
        empty: false,
      })

      const waitlistCollection = createMockCollectionRef()
      waitlistCollection.get = vi.fn().mockResolvedValue({
        docs: [
          createMockDocSnapshot('w1', { status: 'pending' }),
          createMockDocSnapshot('w2', { status: 'approved' }),
          createMockDocSnapshot('w3', { status: 'pending' }),
        ],
        empty: false,
      })

      const mockDb = createMockFirestoreDb({
        inviteCodes: inviteCodesCollection,
        waitlist: waitlistCollection,
      })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { getInviteStats } = await import('../actions')
      const result = await getInviteStats()

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.data.totalInvites).toBe(3)
        expect(result.data.activeInvites).toBe(2)
        expect(result.data.usedInvites).toBe(1)
        expect(result.data.pendingWaitlist).toBe(2)
        expect(result.data.approvedWaitlist).toBe(1)
      }
    })
  })
})
