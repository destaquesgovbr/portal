import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Clipping } from '@/types/clipping'

const mockListClippings = vi.fn()

// Não mockamos `@/lib/graphql/client`: `createSSRClient`/`getClient` reais são
// inócuos (criam um client urql lazy, sem rede) e o serviço de clipping abaixo
// já é mockado — evita quebrar o singleton eager do marketplace importado via
// FollowCard.
vi.mock('@/services/clipping/graphql', () => ({
  createGraphQLClippingService: vi.fn(() => ({
    listClippings: mockListClippings,
  })),
}))

// page.tsx ainda importa getFirestoreDb (usado por getFollows, não por
// getClippings). Mockado para o módulo importar sem efeitos colaterais.
vi.mock('@/lib/firebase-admin', () => ({
  getFirestoreDb: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'
import { getClippings } from '../page'

const mockAuth = vi.mocked(auth)

describe('getClippings (GraphQL — caminho único)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const result = await getClippings()
    expect(result).toEqual([])
    expect(mockListClippings).not.toHaveBeenCalled()
  })

  it('returns empty array when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} } as never)

    const result = await getClippings()
    expect(result).toEqual([])
    expect(mockListClippings).not.toHaveBeenCalled()
  })

  it('returns clippings from the GraphQL service for an authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1' },
      accessToken: 'tok',
    } as never)
    const clippings = [
      { id: 'clip-1', name: 'Meu Clipping' },
      { id: 'clip-2', name: 'Outro' },
    ] as Clipping[]
    mockListClippings.mockResolvedValue(clippings)

    const result = await getClippings()
    expect(result).toEqual(clippings)
    expect(mockListClippings).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when the GraphQL read fails (degradação graciosa)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as never)
    mockListClippings.mockRejectedValue(new Error('GraphQL down'))

    const result = await getClippings()
    expect(result).toEqual([])
  })
})
