/**
 * Implementação GraphQL do `ContentService` (Fase 2B).
 *
 * Camada de conteúdo público (artigos/busca/temas/releases) consumida pelas
 * ~10 server actions migradas do Typesense. Server-importável: este módulo
 * NÃO é `'use client'` — o hook React vive em `index.ts`.
 *
 * O mapper `mapGraphqlArticleToRow` é exportado daqui e é a peça central:
 * converte o `Article` camelCase do graphql-api para o `ArticleRow`
 * (snake_case) que os componentes do portal já esperam.
 *
 * Operations: `src/lib/graphql/queries/articles.ts`.
 * Schema de referência: `src/lib/graphql/schema.graphql`.
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import {
  ARTICLE_QUERY,
  ARTICLES_QUERY,
  type ArticleGraphQL,
  type ArticleQueryData,
  type ArticlesQueryData,
  ESTIMATE_RECORTE_COUNT_QUERY,
  type EstimateRecorteCountQueryData,
  RELATED_ARTICLES_QUERY,
  RELEASE_ARTICLES_QUERY,
  type RelatedArticlesQueryData,
  type ReleaseArticlesQueryData,
  SEARCH_QUERY,
  SEARCH_SUGGESTIONS_QUERY,
  type SearchQueryData,
  type SearchSuggestionsQueryData,
  THEME_ARTICLE_COUNTS_QUERY,
  type ThemeArticleCountsQueryData,
} from '@/lib/graphql/queries/articles'
import type { ArticleRow } from '@/types/article'
import type {
  ContentService,
  EstimateRecorteCountArgs,
  ListArticlesArgs,
  SearchArticlesArgs,
} from './types'

// ---------- Mapper (peça central, compartilhada) ----------

/**
 * Converte uma data ISO (formato `DateTime` do GraphQL) para timestamp Unix
 * em **segundos** — a unidade que o `ArticleRow.published_at`/`extracted_at`
 * usa em todo o portal.
 *
 * Evidência (todos os consumidores tratam como segundos):
 *  - `src/lib/utils.ts` `formatDateTime`: `new Date(timestamp * 1000)`
 *  - `src/lib/feed.ts`: `new Date(article.published_at * 1000)`
 *  - `clipping/release/[releaseId]/artigos/page.tsx`: `published_at * 1000`
 *  - `embed/actions.ts` `isoToUnixSeconds` (mesma conversão).
 *
 * Ausente/inválido → `null`.
 */
function isoToUnixSeconds(iso?: string | null): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

/**
 * Mapeia um `Article` (camelCase, graphql-api) para o `ArticleRow`
 * (snake_case) consumido pelos componentes do portal.
 *
 * Notas de mapeamento:
 *  - `agency` ← `agency` (a CHAVE). `agencyName` é separado e NÃO sobrescreve.
 *  - `theme_1_level_1` é um alias de compatibilidade = `theme1Level1Label`.
 *  - `published_year/month/week` NÃO são expostos pelo `Article` → `null`.
 *  - `tags` default `null` quando ausente.
 */
export function mapGraphqlArticleToRow(article: ArticleGraphQL): ArticleRow {
  return {
    unique_id: article.uniqueId ?? '',
    agency: article.agency ?? null,
    published_at: isoToUnixSeconds(article.publishedAt),
    title: article.title ?? null,
    url: article.url ?? null,
    image: article.image ?? null,
    video_url: article.videoUrl ?? null,
    category: article.category ?? null,
    content: article.content ?? null,
    summary: article.summary ?? null,
    subtitle: article.subtitle ?? null,
    editorial_lead: article.editorialLead ?? null,
    extracted_at: isoToUnixSeconds(article.extractedAt),
    theme_1_level_1_code: article.theme1Level1Code ?? null,
    theme_1_level_1_label: article.theme1Level1Label ?? null,
    theme_1_level_2_code: article.theme1Level2Code ?? null,
    theme_1_level_2_label: article.theme1Level2Label ?? null,
    theme_1_level_3_code: article.theme1Level3Code ?? null,
    theme_1_level_3_label: article.theme1Level3Label ?? null,
    most_specific_theme_code: article.mostSpecificThemeCode ?? null,
    most_specific_theme_label: article.mostSpecificThemeLabel ?? null,
    // Não expostos pelo Article do GraphQL.
    published_year: null,
    published_month: null,
    published_week: null,
    tags: article.tags ?? null,
    // Alias de compatibilidade (espelha o label de nível 1).
    theme_1_level_1: article.theme1Level1Label ?? null,
  }
}

// ---------- Helpers ----------

/** Lê o erro mais útil de um `OperationResult` do urql. */
function unwrapError(error: unknown, fallback: string): Error {
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      graphQLErrors?: Array<{ message: string }>
    }
    if (e.graphQLErrors?.[0]?.message) {
      return new Error(e.graphQLErrors[0].message)
    }
    if (e.message) {
      return new Error(e.message)
    }
  }
  return new Error(fallback)
}

/**
 * Constrói o `ArticleFilter` do schema a partir do filtro do facade + a flag
 * `dedup` (que no schema vive dentro do filtro). Retorna `null` quando não há
 * nada a filtrar — coerente com o default do schema.
 */
function buildFilter(
  filter: ListArticlesArgs['filter'] | SearchArticlesArgs['filter'],
  dedup?: boolean,
): Record<string, unknown> | null {
  const base = filter ?? null
  if (base == null && dedup == null) return null
  return {
    ...(base ?? {}),
    ...(dedup != null ? { dedup } : {}),
  }
}

// ---------- Service ----------

/**
 * Cria a implementação GraphQL com injeção de cliente (facilita testes).
 *
 * @param client Cliente urql. Default: `getClient()` (singleton browser).
 */
export function createGraphQLContentService(
  client: Client = getClient(),
): ContentService {
  return {
    async listArticles(args: ListArticlesArgs = {}) {
      const page = args.page ?? 1
      const limit = args.limit ?? 10
      const filter = buildFilter(args.filter, args.dedup)
      const result = await client
        .query<ArticlesQueryData>(ARTICLES_QUERY, { page, limit, filter })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar artigos')
      }
      const data = result.data?.articles
      return {
        articles: (data?.articles ?? []).map(mapGraphqlArticleToRow),
        found: data?.found ?? 0,
      }
    },

    async searchArticles(args: SearchArticlesArgs) {
      const vars = {
        query: args.query,
        page: args.page ?? 1,
        semantic: args.semantic ?? false,
        alpha: args.alpha ?? null,
        dedup: args.dedup ?? false,
        filter: args.filter ?? null,
      }
      const result = await client
        .query<SearchQueryData>(SEARCH_QUERY, vars)
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro na busca')
      }
      const data = result.data?.search
      return {
        articles: (data?.articles ?? []).map(mapGraphqlArticleToRow),
        found: data?.found ?? 0,
        page: data?.page ?? vars.page,
      }
    },

    async getArticle(uniqueId: string): Promise<ArticleRow | null> {
      const result = await client
        .query<ArticleQueryData>(ARTICLE_QUERY, { uniqueId })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar artigo')
      }
      const node: ArticleGraphQL | null = result.data?.article ?? null
      return node ? mapGraphqlArticleToRow(node) : null
    },

    async getSearchSuggestions(query: string) {
      const result = await client
        .query<SearchSuggestionsQueryData>(SEARCH_SUGGESTIONS_QUERY, { query })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao buscar sugestões')
      }
      return (result.data?.searchSuggestions ?? []).map((s) => ({
        uniqueId: s.uniqueId,
        title: s.title,
      }))
    },

    async getRelatedArticles(uniqueId: string, limit = 4) {
      const result = await client
        .query<RelatedArticlesQueryData>(RELATED_ARTICLES_QUERY, {
          uniqueId,
          limit,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar relacionados')
      }
      return (result.data?.relatedArticles ?? []).map(mapGraphqlArticleToRow)
    },

    async getThemeArticleCounts(days = 30, level = 1) {
      const result = await client
        .query<ThemeArticleCountsQueryData>(THEME_ARTICLE_COUNTS_QUERY, {
          days,
          level,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar contagens por tema')
      }
      return (result.data?.themeArticleCounts ?? []).map((t) => ({
        code: t.code,
        label: t.label ?? null,
        count: t.count,
      }))
    },

    async getReleaseArticles(id: string) {
      const result = await client
        .query<ReleaseArticlesQueryData>(RELEASE_ARTICLES_QUERY, { id })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar artigos da release')
      }
      return (result.data?.releaseArticles ?? []).map(mapGraphqlArticleToRow)
    },

    async estimateRecorteCount(args: EstimateRecorteCountArgs) {
      const result = await client
        .query<EstimateRecorteCountQueryData>(ESTIMATE_RECORTE_COUNT_QUERY, {
          themes: args.themes,
          agencies: args.agencies,
          keywords: args.keywords,
          sinceHours: args.sinceHours ?? 24,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao estimar contagem')
      }
      return result.data?.estimateRecorteCount ?? 0
    },
  }
}

/** Instância pronta para uso client-side. */
export const graphqlContentService: ContentService =
  createGraphQLContentService()
