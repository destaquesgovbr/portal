'use server'

import { deslugifyEntity, matchEntityBySlug } from '@/lib/entity-slug'
import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { ArticleRow } from '@/types/article'

/** Cliente GraphQL público (sem token) para as server actions de entidade. */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

export type ResolvedEntity = {
  /** Texto canônico exato da entidade (usado em `filter.entities`). */
  text: string
  /** Contagem de artigos associada ao facet (best-effort). */
  count: number | null
}

/**
 * Resolve o texto canônico de uma entidade a partir do slug da URL.
 *
 * Estratégia: consulta `entitySuggestions(query=<deslug>)` e escolhe o facet
 * cujo slug bate com o slug-alvo. Retorna `null` quando nada casa — o que é o
 * caso enquanto a Fase 0 (reindex Typesense) não tiver rodado (o resolver
 * retorna vazio). A página trata `null` com um estado vazio amigável.
 */
export async function resolveEntity(
  slug: string,
): Promise<ResolvedEntity | null> {
  const approxQuery = deslugifyEntity(slug)
  const suggestions = await content().getEntitySuggestions(
    approxQuery,
    null,
    20,
  )
  if (suggestions.length === 0) return null

  const match = matchEntityBySlug(
    slug,
    suggestions.map((s) => s.value),
  )
  if (!match) return null

  const facet = suggestions.find((s) => s.value === match)
  return { text: match, count: facet?.count ?? null }
}

export type GetEntityArticlesArgs = {
  /** Texto canônico exato da entidade. */
  entity: string
  page: number
}

export type GetEntityArticlesResult = {
  articles: ArticleRow[]
  page: number
  found: number
}

/**
 * Lista paginada de artigos que mencionam a entidade. Reutiliza a busca
 * (`search`) com `filter.entities=[texto]`, espelhando o comportamento da
 * página /busca (dedup por content_hash, sem busca semântica).
 */
export async function getEntityArticles(
  args: GetEntityArticlesArgs,
): Promise<GetEntityArticlesResult> {
  const { entity, page } = args

  const result = await content().searchArticles({
    query: '',
    page,
    semantic: false,
    dedup: true,
    sort: 'DATE',
    filter: {
      entities: [entity],
    },
  })

  return {
    articles: result.articles,
    page: page + 1,
    found: result.found,
  }
}
