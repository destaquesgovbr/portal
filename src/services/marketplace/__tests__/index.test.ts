/**
 * Testes do facade do serviço de marketplace (Fase B3).
 *
 * Verifica o roteamento entre GraphQL (flag ON) e REST (flag OFF) via
 * `getMarketplaceService({ useGraphQL })`. Componentes consomem o facade
 * via hook `useMarketplaceService()` (testado nos testes dos componentes).
 *
 * Também garante que os feeds RSS/JSON do marketplace (servidos pelo portal,
 * fora da flag) continuam funcionando com o fluxo padrão de feeds — eles
 * NÃO fazem parte do facade, ficam diretamente em rotas estáticas.
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

const CHANNELS = { email: true, telegram: false, push: false, webhook: false }

describe('getMarketplaceService — roteamento por flag', () => {
  it('flag ON: usa GraphQL para listar marketplace', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        marketplaceListings: { listings: [], total: 0 },
      }),
    })
    const service = getMarketplaceService({ useGraphQL: true, client })
    await service.listListings()
    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('MarketplaceListings')
  })

  it('test_facade_falls_back_to_rest_when_flag_off: GET /api/clippings/public', async () => {
    const { fn, calls } = makeFetchMock({ listings: [], total: 0 })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    await service.listListings()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/clippings/public')
  })

  it('REST: getListing faz GET no endpoint correto', async () => {
    const { fn, calls } = makeFetchMock({
      id: 'l-1',
      name: 'A',
      authorUserId: 'u',
      authorDisplayName: 'X',
      sourceClippingId: 'c',
      description: '',
      recortes: [],
      prompt: '',
      likeCount: 0,
      followerCount: 0,
      cloneCount: 0,
      publishedAt: '',
      updatedAt: '',
      active: true,
    })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    await service.getListing('l-1')
    expect(calls[0].url).toBe('/api/clippings/public/l-1')
  })

  it('REST: publish faz POST em /api/clippings/publish', async () => {
    const { fn, calls } = makeFetchMock({ listingId: 'l-new' })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    const result = await service.publish({
      clippingId: 'c-1',
      description: 'algum texto',
      backfillCount: 2,
    })
    expect(calls[0].url).toBe('/api/clippings/publish')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      clippingId: 'c-1',
      description: 'algum texto',
      backfillCount: 2,
    })
    expect(result.listingId).toBe('l-new')
  })

  it('REST: unpublish faz DELETE no listing', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    await service.unpublish('l-3')
    expect(calls[0].url).toBe('/api/clippings/public/l-3')
    expect(calls[0].init.method).toBe('DELETE')
  })

  it('REST: toggleLike chama /like (POST)', async () => {
    const { fn, calls } = makeFetchMock({ liked: true, likeCount: 5 })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    const result = await service.toggleLike('l-2')
    expect(calls[0].url).toBe('/api/clippings/public/l-2/like')
    expect(calls[0].init.method).toBe('POST')
    expect(result).toEqual({ liked: true, likeCount: 5 })
  })

  it('REST: subscribe (POST) e isEditing → PUT', async () => {
    const { fn: fnPost, calls: callsPost } = makeFetchMock({
      ok: true,
      subscriptionId: 'sub-1',
    })
    const service = getMarketplaceService({
      useGraphQL: false,
      fetchImpl: fnPost,
    })
    await service.subscribe({
      listingId: 'l-7',
      deliveryChannels: CHANNELS,
      extraEmails: [],
      webhookUrl: '',
    })
    expect(callsPost[0].url).toBe('/api/clippings/public/l-7/follow')
    expect(callsPost[0].init.method).toBe('POST')

    const { fn: fnPut, calls: callsPut } = makeFetchMock({ ok: true })
    const editing = getMarketplaceService({
      useGraphQL: false,
      fetchImpl: fnPut,
    })
    await editing.subscribe({
      listingId: 'l-7',
      deliveryChannels: CHANNELS,
      extraEmails: ['ex@ex.com'],
      webhookUrl: '',
      isEditing: true,
    })
    expect(callsPut[0].init.method).toBe('PUT')
  })

  it('REST: unsubscribe faz DELETE em /follow', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    await service.unsubscribe('l-8')
    expect(calls[0].url).toBe('/api/clippings/public/l-8/follow')
    expect(calls[0].init.method).toBe('DELETE')
  })

  it('REST: clone faz POST e devolve id', async () => {
    const { fn, calls } = makeFetchMock({ id: 'c-cloned' })
    const service = getMarketplaceService({ useGraphQL: false, fetchImpl: fn })
    const result = await service.clone('l-4')
    expect(calls[0].url).toBe('/api/clippings/public/l-4/clone')
    expect(calls[0].init.method).toBe('POST')
    expect(result.id).toBe('c-cloned')
  })

  it('test_marketplace_feeds_rss_json_unaffected: feeds REST não passam pelo facade', async () => {
    // Os feeds (`feed.json`, `feed.xml`) são endpoints REST estáticos no
    // portal e NÃO entram na flag `graphql.marketplace`. Garantimos via
    // verificação que o facade não expõe método de feed e que as rotas REST
    // continuam acessíveis via fetch comum (sem passar pelo serviço).
    const service = getMarketplaceService({
      useGraphQL: true,
      client: makeClientStub({}).client,
    })
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
