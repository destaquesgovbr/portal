import { vi } from 'vitest'

interface MockSession {
  user: {
    id: string
    name: string
    email: string
    roles: string[]
  }
}

export function mockAuthenticated(
  overrides: Partial<MockSession['user']> = {},
): MockSession {
  return {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      roles: [],
      ...overrides,
    },
  }
}

export function mockAdmin(
  overrides: Partial<MockSession['user']> = {},
): MockSession {
  return mockAuthenticated({
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    roles: ['admin'],
    ...overrides,
  })
}

export function mockUnauthenticated(): null {
  return null
}

/**
 * Sets up vi.mock for `@/auth` returning the given session.
 * Call at the top of a test file or in beforeEach.
 */
export function setupAuthMock(session: MockSession | null) {
  vi.doMock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue(session),
  }))
}
