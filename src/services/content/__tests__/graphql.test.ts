/**
 * Testes da implementação GraphQL do `ContentService` (Fase 2B).
 *
 * Cada método verifica: (a) a operação certa é enviada, (b) as variáveis
 * corretas, (c) o resultado vem mapeado via o mapper compartilhado.
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import type { ArticleGraphQL } from '@/lib/graphql/queries/articles'
import { createGraphQLContentService } from '../graphql'

// ---------- Helpers ----------

interface Op {
  query: string
  vars: unknown
}

function makeClientStub(handlers: {
  onQuery?: (query: string, vars: unknown) => unknown
  queryError?: unknown
}): { client: Client; queries: Op[] } {
  const queries: Op[] = []
  const client = {
    query: (doc: { loc?: { source?: { body: string } } }, vars: unknown) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        queries.push({ query: body, vars })
        return {
          data: handlers.onQuery?.(body, vars) ?? {},
          error: handlers.queryError,
        }
      },
    }),
  } as unknown as Client
  return { client, queries }
}

function node(overrides: Partial<ArticleGraphQL> = {}): ArticleGraphQL {
  return {
    uniqueId: 'a-1',
    title: 'T',
    url: 'https://x',
    image: null,
    videoUrl: null,
    content: null,
    summary: null,
    subtitle: null,
    editorialLead: null,
    category: 'Cat',
    tags: ['t1'],
    agency: 'ag-1',
    agencyName: 'Agência 1',
    publishedAt: '2026-05-01T10:00:00Z',
    extractedAt: null,
    theme1Level1Code: '01',
    theme1Level1Label: 'Tema 1',
    theme1Level2Code: null,
    theme1Level2Label: null,
    theme1Level3Code: null,
    theme1Level3Label: null,
    mostSpecificThemeCode: '01',
    mostSpecificThemeLabel: 'Tema 1',
    ...overrides,
  }
}

describe('createGraphQLContentService', () => {
  describe('listArticles', () => {
    it('envia a query articles com page/limit/filter e mapeia o resultado', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          articles: { articles: [node()], page: 2, found: 42 },
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.listArticles({
        page: 2,
        limit: 5,
        filter: { agencies: ['ag-1'] },
        dedup: true,
      })

      expect(queries).toHaveLength(1)
      expect(queries[0].query).toContain('query Articles')
      expect(queries[0].vars).toEqual({
        page: 2,
        limit: 5,
        filter: { agencies: ['ag-1'], dedup: true },
      })
      expect(res.found).toBe(42)
      expect(res.articles).toHaveLength(1)
      expect(res.articles[0].unique_id).toBe('a-1')
      expect(res.articles[0].published_at).toBe(1777629600)
    })

    it('usa defaults page=1/limit=10 e filter null quando ausente', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ articles: { articles: [], page: 1, found: 0 } }),
      })
      const svc = createGraphQLContentService(client)
      await svc.listArticles()
      expect(queries[0].vars).toEqual({ page: 1, limit: 10, filter: null })
    })

    it('lança erro útil quando a query falha', async () => {
      const { client } = makeClientStub({
        queryError: { graphQLErrors: [{ message: 'boom' }] },
      })
      const svc = createGraphQLContentService(client)
      await expect(svc.listArticles()).rejects.toThrow('boom')
    })
  })

  describe('searchArticles', () => {
    it('envia a query search com todos os argumentos e retorna page', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          search: { articles: [node()], page: 3, found: 7 },
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.searchArticles({
        query: 'fgts',
        page: 3,
        semantic: true,
        alpha: 0.5,
        dedup: true,
        filter: { themes: ['01'] },
      })

      expect(queries[0].query).toContain('query Search')
      expect(queries[0].vars).toEqual({
        query: 'fgts',
        page: 3,
        semantic: true,
        alpha: 0.5,
        dedup: true,
        filter: { themes: ['01'] },
        sort: null,
      })
      expect(res.page).toBe(3)
      expect(res.found).toBe(7)
      expect(res.articles[0].unique_id).toBe('a-1')
    })

    it('aplica defaults (page=1, semantic=false, alpha=null, dedup=false)', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ search: { articles: [], page: 1, found: 0 } }),
      })
      const svc = createGraphQLContentService(client)
      await svc.searchArticles({ query: 'x' })
      expect(queries[0].vars).toEqual({
        query: 'x',
        page: 1,
        semantic: false,
        alpha: null,
        dedup: false,
        filter: null,
        sort: null,
      })
    })
  })

  describe('getArticle', () => {
    it('envia a query article com uniqueId e mapeia', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ article: node({ uniqueId: 'art-9' }) }),
      })
      const svc = createGraphQLContentService(client)
      const row = await svc.getArticle('art-9')
      expect(queries[0].query).toContain('query Article')
      expect(queries[0].vars).toEqual({ uniqueId: 'art-9' })
      expect(row?.unique_id).toBe('art-9')
    })

    it('retorna null quando o artigo não existe', async () => {
      const { client } = makeClientStub({ onQuery: () => ({ article: null }) })
      const svc = createGraphQLContentService(client)
      expect(await svc.getArticle('nope')).toBeNull()
    })
  })

  describe('getSearchSuggestions', () => {
    it('envia a query e retorna {uniqueId,title}[]', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          searchSuggestions: [{ uniqueId: 's1', title: 'Sug 1' }],
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getSearchSuggestions('fg')
      expect(queries[0].query).toContain('query SearchSuggestions')
      expect(queries[0].vars).toEqual({ query: 'fg' })
      expect(res).toEqual([{ uniqueId: 's1', title: 'Sug 1' }])
    })
  })

  describe('getRelatedArticles', () => {
    it('envia uniqueId/limit e mapeia a lista', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ relatedArticles: [node()] }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getRelatedArticles('a-1', 6)
      expect(queries[0].query).toContain('query RelatedArticles')
      expect(queries[0].vars).toEqual({ uniqueId: 'a-1', limit: 6 })
      expect(res[0].unique_id).toBe('a-1')
    })

    it('usa limit default 4', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ relatedArticles: [] }),
      })
      const svc = createGraphQLContentService(client)
      await svc.getRelatedArticles('a-1')
      expect(queries[0].vars).toEqual({ uniqueId: 'a-1', limit: 4 })
    })
  })

  describe('getThemeArticleCounts', () => {
    it('envia days/level e devolve {code,label,count}[]', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          themeArticleCounts: [{ code: '01', label: 'Tema', count: 5 }],
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getThemeArticleCounts(7, 2)
      expect(queries[0].query).toContain('query ThemeArticleCounts')
      expect(queries[0].vars).toEqual({ days: 7, level: 2 })
      expect(res).toEqual([{ code: '01', label: 'Tema', count: 5 }])
    })

    it('usa defaults days=30/level=1', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ themeArticleCounts: [] }),
      })
      const svc = createGraphQLContentService(client)
      await svc.getThemeArticleCounts()
      expect(queries[0].vars).toEqual({ days: 30, level: 1 })
    })
  })

  describe('getEntity', () => {
    it('envia a query entity com id e mapeia o nó canônico', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          entity: {
            entityId: 'Q216330',
            canonicalName: 'Ministério da Saúde',
            type: 'ORG',
            aliases: ['MS', 'Ministério da Saúde'],
            wikidataId: 'Q216330',
            wikidataUrl: 'https://www.wikidata.org/wiki/Q216330',
            description: 'Órgão do governo federal',
            agencyKey: 'ministerio-da-saude',
          },
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getEntity('Q216330')
      expect(queries[0].query).toContain('query Entity')
      expect(queries[0].vars).toEqual({ id: 'Q216330' })
      expect(res).toEqual({
        entityId: 'Q216330',
        canonicalName: 'Ministério da Saúde',
        type: 'ORG',
        aliases: ['MS', 'Ministério da Saúde'],
        wikidataId: 'Q216330',
        wikidataUrl: 'https://www.wikidata.org/wiki/Q216330',
        description: 'Órgão do governo federal',
        agencyKey: 'ministerio-da-saude',
      })
    })

    it('retorna null quando o id não existe', async () => {
      const { client } = makeClientStub({ onQuery: () => ({ entity: null }) })
      const svc = createGraphQLContentService(client)
      expect(await svc.getEntity('Q0')).toBeNull()
    })

    it('degrada para null quando a query falha (canonicalização pendente)', async () => {
      const { client } = makeClientStub({
        queryError: { graphQLErrors: [{ message: 'no entity resolver' }] },
      })
      const svc = createGraphQLContentService(client)
      expect(await svc.getEntity('Q1')).toBeNull()
    })
  })

  describe('getEntitySuggestions', () => {
    it('faz passthrough de entityId/label quando presentes', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({
          entitySuggestions: [
            {
              value: 'Ministério da Saúde',
              count: 12,
              entityId: 'Q216330',
              label: 'Ministério da Saúde',
            },
          ],
        }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getEntitySuggestions('mini', 'ORG', 5)
      expect(queries[0].query).toContain('query EntitySuggestions')
      expect(queries[0].vars).toEqual({ query: 'mini', type: 'ORG', limit: 5 })
      expect(res).toEqual([
        {
          value: 'Ministério da Saúde',
          count: 12,
          entityId: 'Q216330',
          label: 'Ministério da Saúde',
        },
      ])
    })

    it('degrada para [] em erro (Fase 0 pendente)', async () => {
      const { client } = makeClientStub({
        queryError: { graphQLErrors: [{ message: 'no field entities' }] },
      })
      const svc = createGraphQLContentService(client)
      expect(await svc.getEntitySuggestions('x')).toEqual([])
    })
  })

  describe('getReleaseArticles', () => {
    it('envia id e mapeia a lista', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ releaseArticles: [node()] }),
      })
      const svc = createGraphQLContentService(client)
      const res = await svc.getReleaseArticles('rel-1')
      expect(queries[0].query).toContain('query ReleaseArticles')
      expect(queries[0].vars).toEqual({ id: 'rel-1' })
      expect(res[0].unique_id).toBe('a-1')
    })
  })

  describe('estimateRecorteCount', () => {
    it('envia themes/agencies/keywords/sinceHours e retorna o número', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ estimateRecorteCount: 123 }),
      })
      const svc = createGraphQLContentService(client)
      const n = await svc.estimateRecorteCount({
        themes: ['01'],
        agencies: ['ag'],
        keywords: ['k'],
        sinceHours: 48,
      })
      expect(queries[0].query).toContain('query EstimateRecorteCount')
      expect(queries[0].vars).toEqual({
        themes: ['01'],
        agencies: ['ag'],
        keywords: ['k'],
        sinceHours: 48,
      })
      expect(n).toBe(123)
    })

    it('usa sinceHours default 24', async () => {
      const { client, queries } = makeClientStub({
        onQuery: () => ({ estimateRecorteCount: 0 }),
      })
      const svc = createGraphQLContentService(client)
      await svc.estimateRecorteCount({
        themes: [],
        agencies: [],
        keywords: [],
      })
      expect(queries[0].vars).toEqual({
        themes: [],
        agencies: [],
        keywords: [],
        sinceHours: 24,
      })
    })
  })
})
