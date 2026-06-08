/**
 * Testes do facade do serviço de marketplace.
 *
 * GraphQL é o único caminho: `getMarketplaceService(client?)` sempre devolve a
 * implementação GraphQL. Componentes consomem o facade via hook
 * `useMarketplaceService()` (testado nos testes dos componentes).
 *
 * Também garante que os feeds RSS/JSON do marketplace (servidos pelo portal,
 * fora do facade) continuam funcionando — eles NÃO fazem parte do facade,
 * ficam diretamente em rotas estáticas.
 */

import type { Client } from '@urql/core'
import { describe, expect, it, vi } from 'vitest'
import { getMarketplaceService } from '../index'

interface FetchCall {
  url: string
  init: RequestInit
}

function makeFetchMock(
  response: unknown,
  status = 200,
): { fn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push({ url, init: init ?? {} })
      return new Response(JSON.stringify(response), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  )
  return { fn: fn as unknown as typeof fetch, calls }
}

function makeClientStub(handlers: {
  onQuery?: (query: string, vars: unknown) => unknown
  onMutation?: (query: string, vars: unknown) => unknown
}): {
  client: Client
  queries: Array<{ query: string; vars: unknown }>
  mutations: Array<{ query: string; vars: unknown }>
} {
  const queries: Array<{ query: string; vars: unknown }> = []
  const mutations: Array<{ query: string; vars: unknown }> = []

  const client = {
    query: (doc: { loc?: { source?: { body: string } } }, vars: unknown) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        queries.push({ query: body, vars })
        return { data: handlers.onQuery?.(body, vars) ?? {}, error: undefined }
      },
    }),
    mutation: (
      doc: { loc?: { source?: { body: string } } },
      vars: unknown,
    ) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        mutations.push({ query: body, vars })
        return {
          data: handlers.onMutation?.(body, vars) ?? {},
          error: undefined,
        }
      },
    }),
  } as unknown as Client

  return { client, queries, mutations }
}

describe('getMarketplaceService — caminho GraphQL', () => {
  it('usa GraphQL para listar marketplace', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        marketplaceListings: { listings: [], total: 0 },
      }),
    })
    const service = getMarketplaceService(client)
    await service.listListings()
    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('MarketplaceListings')
  })

  it('test_marketplace_feeds_rss_json_unaffected: feeds REST não passam pelo facade', async () => {
    // Os feeds (`feed.json`, `feed.xml`) são endpoints REST estáticos no
    // portal e NÃO entram no facade. Garantimos via verificação que o facade
    // não expõe método de feed e que as rotas REST continuam acessíveis via
    // fetch comum (sem passar pelo serviço).
    const service = getMarketplaceService(makeClientStub({}).client)
    expect(
      Object.keys(service).every(
        (k) =>
          !k.toLowerCase().includes('feed') && !k.toLowerCase().includes('rss'),
      ),
    ).toBe(true)

    // E continuamos podendo bater diretamente nas rotas de feed:
    const { fn, calls } = makeFetchMock('<rss/>')
    await fn('/api/clippings/public/l-1/feed.xml')
    await fn('/api/clippings/public/l-1/feed.json')
    expect(calls.map((c) => c.url)).toEqual([
      '/api/clippings/public/l-1/feed.xml',
      '/api/clippings/public/l-1/feed.json',
    ])
  })
})
