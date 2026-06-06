/**
 * Testes do cliente GraphQL urql (PLANO-ATUALIZACAO-v2, Fase B1).
 *
 * Cobre:
 *   - Inicialização do client com `url`.
 *   - Injeção de `Authorization: Bearer <jwt>` quando há sessão.
 *   - Ausência do header quando não há sessão.
 *   - Singleton `getClient()` reaproveita instância.
 */

import { gql } from '@urql/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetClientForTesting,
  createGraphQLClient,
  createSSRClient,
  getClient,
} from '../client'

// ---- helpers ----

interface FetchCall {
  url: string
  init: RequestInit
}

function mockFetch(response: unknown = { data: {} }): {
  calls: FetchCall[]
  restore: () => void
} {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  globalThis.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push({ url, init: init ?? {} })
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  ) as unknown as typeof fetch
  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

const PING_QUERY = gql`
  query Ping {
    __typename
  }
`

/** Lookup case-insensitive em Headers/objeto plano (urql normaliza para lowercase). */
function getHeader(
  headers: Record<string, string> | Headers | undefined,
  name: string,
): string | null | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) {
    return headers.get(name)
  }
  const lower = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return value
    }
  }
  return undefined
}

describe('createGraphQLClient', () => {
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    fetchMock.restore()
  })

  it('test_graphql_client_initializes_with_url: cria um Client sem crash quando recebe `url`', () => {
    const client = createGraphQLClient({
      url: 'http://example.test/graphql',
      // sem subscriptions para evitar conexão SSE em jsdom
      skipSubscriptions: true,
    })
    expect(client).toBeDefined()
    // urql Client expõe os métodos esperados
    expect(typeof client.query).toBe('function')
    expect(typeof client.mutation).toBe('function')
  })

  it('test_graphql_client_sends_auth_header_when_session: injeta Authorization quando getToken retorna JWT', async () => {
    const client = createGraphQLClient({
      url: 'http://example.test/graphql',
      getToken: async () => 'jwt-token-abc',
      skipSubscriptions: true,
    })

    await client.query(PING_QUERY, {}).toPromise()

    expect(fetchMock.calls.length).toBeGreaterThan(0)
    const headers = fetchMock.calls[0]?.init.headers as
      | Record<string, string>
      | Headers
      | undefined
    const authHeader = getHeader(headers, 'Authorization')
    expect(authHeader).toBe('Bearer jwt-token-abc')
  })

  it('test_graphql_client_no_auth_header_when_no_session: não envia Authorization quando getToken retorna null', async () => {
    const client = createGraphQLClient({
      url: 'http://example.test/graphql',
      getToken: async () => null,
      skipSubscriptions: true,
    })

    await client.query(PING_QUERY, {}).toPromise()

    expect(fetchMock.calls.length).toBeGreaterThan(0)
    const headers = fetchMock.calls[0]?.init.headers as
      | Record<string, string>
      | Headers
      | undefined
    const authHeader = getHeader(headers, 'Authorization')
    expect(authHeader).toBeFalsy()
  })

  it('test_graphql_client_no_auth_header_when_getToken_omitted: sem getToken, nenhum header de auth', async () => {
    const client = createGraphQLClient({
      url: 'http://example.test/graphql',
      skipSubscriptions: true,
    })

    await client.query(PING_QUERY, {}).toPromise()

    expect(fetchMock.calls.length).toBeGreaterThan(0)
    const headers = fetchMock.calls[0]?.init.headers as
      | Record<string, string>
      | Headers
      | undefined
    const authHeader = getHeader(headers, 'Authorization')
    expect(authHeader).toBeFalsy()
  })
})

describe('getClient (singleton)', () => {
  beforeEach(() => {
    __resetClientForTesting()
  })

  it('test_get_client_returns_singleton: chamadas repetidas retornam a mesma instância', () => {
    const a = getClient()
    const b = getClient()
    expect(a).toBe(b)
  })
})

describe('createSSRClient', () => {
  it('test_ssr_client_creates_independent_instances: cada chamada retorna instância nova', () => {
    const a = createSSRClient()
    const b = createSSRClient()
    expect(a).not.toBe(b)
  })
})
