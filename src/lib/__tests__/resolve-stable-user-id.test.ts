import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn().mockReturnValue({ set: mockSet })
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockCollection = vi.fn()

vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

import { resolveStableUser } from '../resolve-stable-user-id'

describe('resolveStableUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  it('returns existing user ID and role when email is found in Firestore', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-user-123', data: () => ({ role: 'admin' }) }],
    })

    const result = await resolveStableUser(
      'user@example.com',
      'new-provider-sub',
    )

    expect(result).toEqual({ userId: 'existing-user-123', role: 'admin' })
    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockWhere).toHaveBeenCalledWith('email', '==', 'user@example.com')
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  it('defaults role to user when doc has no role field', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-user-123', data: () => ({}) }],
    })

    const result = await resolveStableUser(
      'user@example.com',
      'new-provider-sub',
    )

    expect(result).toEqual({ userId: 'existing-user-123', role: 'user' })
  })

  it('returns providerSub with role user and creates user doc when no existing user is found', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    })
    mockCollection.mockImplementation((name: string) => {
      if (name === 'users') {
        return { where: mockWhere, doc: mockDoc }
      }
      return { where: mockWhere }
    })

    const result = await resolveStableUser(
      'new@example.com',
      'provider-sub-456',
    )

    expect(result).toEqual({ userId: 'provider-sub-456', role: 'user' })
    expect(mockDoc).toHaveBeenCalledWith('provider-sub-456')
    expect(mockSet).toHaveBeenCalledWith(
      { email: 'new@example.com', role: 'user' },
      { merge: true },
    )
  })

  it('returns providerSub with role user when Firestore query fails', async () => {
    mockGet.mockRejectedValue(new Error('Firestore unavailable'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await resolveStableUser('user@example.com', 'fallback-sub')

    expect(result).toEqual({ userId: 'fallback-sub', role: 'user' })
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to resolve stable user:',
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })

  it('always returns first matching user when multiple exist', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        { id: 'first-user', data: () => ({ role: 'admin' }) },
        { id: 'second-user', data: () => ({ role: 'user' }) },
      ],
    })

    const result = await resolveStableUser('user@example.com', 'provider-sub')

    expect(result).toEqual({ userId: 'first-user', role: 'admin' })
  })

  it('normalizes email to lowercase before querying', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-user', data: () => ({ role: 'user' }) }],
    })

    await resolveStableUser('User@Example.COM', 'provider-sub')

    expect(mockWhere).toHaveBeenCalledWith('email', '==', 'user@example.com')
  })

  it('finds user even when email case differs between providers', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'google-user-id', data: () => ({ role: 'user' }) }],
    })

    const result = await resolveStableUser('Nitai@Gmail.com', 'keycloak-uuid')

    expect(result).toEqual({ userId: 'google-user-id', role: 'user' })
    expect(mockWhere).toHaveBeenCalledWith('email', '==', 'nitai@gmail.com')
  })
})
