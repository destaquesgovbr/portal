/**
 * Testes do facade de widgets (PLANO-ATUALIZACAO-v2, Fase B5).
 *
 * Verifica o roteamento entre GraphQL (flag ON) e REST (flag OFF) para
 * `widgetConfig` e `widgetArticles`, incluindo passagem correta de
 * filtros (agencies, themes, limit, page).
 */

import type { Client } from '@urql/core'
import { describe, expect, it, vi } from 'vitest'
import { getWidgetArticles, getWidgetConfig } from '../index'

interface FetchCall {
  url: string
  init: RequestInit
}

function makeFetchMock(response: unknown, status = 200) {
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

function makeClientStub(onQuery: (query: string, vars: unknown) => unknown): {
  client: Client
  queries: Array<{ query: string; vars: unknown }>
} {
  const queries: Array<{ query: string; vars: unknown }> = []
  const client = {
    query: (doc: { loc?: { source?: { body: string } } }, vars: unknown) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        queries.push({ query: body, vars })
        const data = onQuery(body, vars) ?? {}
        return { data, error: undefined }
      },
    }),
  } as unknown as Client
  return { client, queries }
}

describe('widgets facade — GraphQL routing (flag ON)', () => {
  it('test_widgetConfig_via_graphql: retorna agencies/themes hidratados a partir das chaves', async () => {
    const { client, queries } = makeClientStub(() => ({
      widgetConfig: {
        agencies: ['mfin', 'mec'],
        themes: ['educacao', 'economia'],
      },
    }))

    const result = await getWidgetConfig({ useGraphQL: true, client })

    expect(result.agencies).toEqual([
      { key: 'mfin', name: 'mfin', type: 'agency' },
      { key: 'mec', name: 'mec', type: 'agency' },
    ])
    expect(result.themes).toEqual([
      { key: 'educacao', name: 'educacao' },
      { key: 'economia', name: 'economia' },
    ])
    expect(queries[0].query).toContain('WidgetConfig')
  })

  it('test_widgetArticles_via_graphql_passes_filters: encaminha agencies/themes/limit/page', async () => {
    const { client, queries } = makeClientStub(() => ({
      widgetArticles: {
        articles: [],
        pagination: { page: 2, limit: 5, total: 0, hasMore: false },
      },
    }))

    await getWidgetArticles(
      {
        agencies: ['mfin'],
        themes: ['economia'],
        limit: 5,
        page: 2,
      },
      { useGraphQL: true, client },
    )

    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('WidgetArticles')
    const vars = queries[0].vars as {
      config: {
        agencies: string[]
        themes: string[]
        articlesPerPage: number
      }
      page: number
    }
    expect(vars.config.agencies).toEqual(['mfin'])
    expect(vars.config.themes).toEqual(['economia'])
    expect(vars.config.articlesPerPage).toBe(5)
    expect(vars.page).toBe(2)
  })

  it('test_widgetArticles_via_graphql_defaults: usa page=1 e limit=10 quando ausentes', async () => {
    const { client, queries } = makeClientStub(() => ({
      widgetArticles: {
        articles: [],
        pagination: { page: 1, limit: 10, total: 0, hasMore: false },
      },
    }))

    await getWidgetArticles({}, { useGraphQL: true, client })

    const vars = queries[0].vars as {
      config: { articlesPerPage: number; agencies: string[] }
      page: number
    }
    expect(vars.page).toBe(1)
    expect(vars.config.articlesPerPage).toBe(10)
    expect(vars.config.agencies).toEqual([])
  })

  it('test_widgetArticles_graphql_returns_pagination_from_server', async () => {
    const { client } = makeClientStub(() => ({
      widgetArticles: {
        articles: [{ uniqueId: 'a1' }, { uniqueId: 'a2' }],
        pagination: { page: 1, limit: 10, total: 42, hasMore: true },
      },
    }))

    const result = await getWidgetArticles({}, { useGraphQL: true, client })

    expect(result.articles).toHaveLength(2)
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 42,
      hasMore: true,
    })
  })
})

describe('widgets facade — REST fallback (flag OFF)', () => {
  it('test_facade_falls_back_to_rest_when_flag_off_widgets: getWidgetConfig usa /api/widgets/config', async () => {
    const data = {
      agencies: [{ key: 'mfin', name: 'Fazenda', type: 'agency' }],
      themes: [{ key: 'economia', name: 'Economia' }],
    }
    const { fn, calls } = makeFetchMock(data)

    const result = await getWidgetConfig({
      useGraphQL: false,
      fetchImpl: fn,
    })

    expect(result).toEqual(data)
    expect(calls[0].url).toBe('/api/widgets/config')
  })

  it('test_widgetArticles_rest_uses_query_string', async () => {
    const data = {
      articles: [],
      pagination: { page: 1, limit: 10, total: 0, hasMore: false },
      filters: { agencies: [], themes: [] },
    }
    const { fn, calls } = makeFetchMock(data)

    await getWidgetArticles(
      { agencies: ['mfin', 'mec'], limit: 5, page: 2 },
      { useGraphQL: false, fetchImpl: fn },
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/^\/api\/widgets\/articles\?/)
    expect(calls[0].url).toContain('agencies=mfin%2Cmec')
    expect(calls[0].url).toContain('limit=5')
    expect(calls[0].url).toContain('page=2')
  })

  it('test_widgetArticles_rest_no_query_string_when_empty', async () => {
    const data = {
      articles: [],
      pagination: { page: 1, limit: 10, total: 0, hasMore: false },
      filters: { agencies: [], themes: [] },
    }
    const { fn, calls } = makeFetchMock(data)

    await getWidgetArticles({}, { useGraphQL: false, fetchImpl: fn })

    expect(calls[0].url).toBe('/api/widgets/articles')
  })
})
