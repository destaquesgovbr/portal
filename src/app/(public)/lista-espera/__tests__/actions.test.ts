import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockCollectionRef,
  createMockDocSnapshot,
  createMockFirestoreDb,
} from '@/__tests__/mocks/firebase-admin'
import { ActionState, ActionStateEnum } from '@/types/action-state'

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(),
}))

describe('lista-espera actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('submitToWaitlist', () => {
    it('successfully adds email to waitlist', async () => {
      const waitlistCollection = createMockCollectionRef()
      waitlistCollection.get = vi
        .fn()
        .mockResolvedValue({ docs: [], empty: true })

      const mockDb = createMockFirestoreDb({ waitlist: waitlistCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { submitToWaitlist } = await import('../actions')

      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('name', 'Test User')

      const result = await submitToWaitlist(ActionState.idle(), formData)

      expect(result.state).toBe(ActionStateEnum.Success)
      expect(waitlistCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          status: 'pending',
        }),
      )
    })

    it('normalizes email to lowercase', async () => {
      const waitlistCollection = createMockCollectionRef()
      waitlistCollection.get = vi
        .fn()
        .mockResolvedValue({ docs: [], empty: true })

      const mockDb = createMockFirestoreDb({ waitlist: waitlistCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { submitToWaitlist } = await import('../actions')

      const formData = new FormData()
      formData.append('email', 'Test@EXAMPLE.com')

      const result = await submitToWaitlist(ActionState.idle(), formData)

      expect(result.state).toBe(ActionStateEnum.Success)
      expect(waitlistCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      )
    })

    it('returns error for invalid email', async () => {
      const mockDb = createMockFirestoreDb()
      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { submitToWaitlist } = await import('../actions')

      const formData = new FormData()
      formData.append('email', 'not-an-email')

      const result = await submitToWaitlist(ActionState.idle(), formData)

      expect(result.state).toBe(ActionStateEnum.Error)
    })

    it('returns error for duplicate email', async () => {
      const waitlistCollection = createMockCollectionRef()
      waitlistCollection.get = vi.fn().mockResolvedValue({
        docs: [
          createMockDocSnapshot('existing', { email: 'test@example.com' }),
        ],
        empty: false,
      })

      const mockDb = createMockFirestoreDb({ waitlist: waitlistCollection })

      const { getFirestoreDb } = await import('@/lib/firebase-admin')
      vi.mocked(getFirestoreDb).mockReturnValue(mockDb as never)

      const { submitToWaitlist } = await import('../actions')

      const formData = new FormData()
      formData.append('email', 'test@example.com')

      const result = await submitToWaitlist(ActionState.idle(), formData)

      expect(result.state).toBe(ActionStateEnum.Error)
    })
  })
})
