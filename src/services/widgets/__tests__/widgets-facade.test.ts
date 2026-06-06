/**
 * Testes do facade de widgets (R1 — GraphQL como único caminho).
 *
 * Verifica `widgetConfig` e `widgetArticles` via GraphQL, incluindo
 * passagem correta de filtros (agencies, themes, limit, page). O facade
 * aceita um `client` opcional (default `getClient()`); aqui injetamos um
 * stub.
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import { getWidgetArticles, getWidgetConfig } from '../index'

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

describe('widgets facade — GraphQL (único caminho)', () => {
  it('test_widgetConfig_via_graphql: retorna agencies/themes hidratados a partir das chaves', async () => {
    const { client, queries } = makeClientStub(() => ({
      widgetConfig: {
        agencies: ['mfin', 'mec'],
        themes: ['educacao', 'economia'],
      },
    }))

    const result = await getWidgetConfig(client)

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
      client,
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

    await getWidgetArticles({}, client)

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

    const result = await getWidgetArticles({}, client)

    expect(result.articles).toHaveLength(2)
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 42,
      hasMore: true,
    })
  })
})
