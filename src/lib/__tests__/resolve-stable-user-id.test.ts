import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockCollection = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

import { resolveStableUserId } from '../resolve-stable-user-id'

describe('resolveStableUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  it('returns existing user ID when email is found in Firestore', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-user-123' }],
    })

    const result = await resolveStableUserId(
      'user@example.com',
      'new-provider-sub',
    )

    expect(result).toBe('existing-user-123')
    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockWhere).toHaveBeenCalledWith('email', '==', 'user@example.com')
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  it('returns providerSub when no existing user is found', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    })

    const result = await resolveStableUserId(
      'new@example.com',
      'provider-sub-456',
    )

    expect(result).toBe('provider-sub-456')
  })

  it('returns providerSub when Firestore query fails', async () => {
    mockGet.mockRejectedValue(new Error('Firestore unavailable'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await resolveStableUserId('user@example.com', 'fallback-sub')

    expect(result).toBe('fallback-sub')
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to resolve stable user ID:',
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })

  it('always returns first matching user when multiple exist', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'first-user' }, { id: 'second-user' }],
    })

    const result = await resolveStableUserId('user@example.com', 'provider-sub')

    expect(result).toBe('first-user')
  })
})
