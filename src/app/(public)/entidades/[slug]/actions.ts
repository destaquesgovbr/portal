'use server'

import {
  deslugifyEntity,
  isCanonicalEntityId,
  matchEntityBySlug,
} from '@/lib/entity-slug'
import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { EntityNode } from '@/services/content/types'
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
 * Cabeçalho de uma entidade canônica, resolvido por `entity(id)`. `null` quando
 * o id não existe (ou o `entity(id)` ainda não está disponível) — a página
 * então cai num cabeçalho mínimo a partir do próprio id.
 */
export async function resolveCanonicalEntity(
  id: string,
): Promise<EntityNode | null> {
  if (!isCanonicalEntityId(id)) return null
  return content().getEntity(id)
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
  /**
   * Texto canônico exato da entidade (caminho legado fuzzy-text). Ignorado
   * quando `canonicalId` está presente.
   */
  entity: string
  /** Id canônico (`Q…`/`dgb_…`); quando presente, filtra por `entityCanonical`. */
  canonicalId?: string | null
  page: number
}

export type GetEntityArticlesResult = {
  articles: ArticleRow[]
  page: number
  found: number
}

/**
 * Lista paginada de artigos que mencionam a entidade. Reutiliza a busca
 * (`search`) filter-only (dedup por content_hash, sem busca semântica).
 *
 * - **Canônico** (`canonicalId`): filtra por `filter.entityCanonical=[id]` —
 *   dedup'd por `entity_id`, robusto a variantes de texto.
 * - **Legado** (texto): filtra por `filter.entities=[texto]` (migração graciosa).
 */
export async function getEntityArticles(
  args: GetEntityArticlesArgs,
): Promise<GetEntityArticlesResult> {
  const { entity, canonicalId, page } = args

  const result = await content().searchArticles({
    // Busca filter-only por entidade: o resolver `search` do graphql-api
    // rejeita query vazia ("Query must not be empty"). `'*'` é o wildcard
    // filter-only aceito (convenção já usada em outros call-sites).
    query: '*',
    page,
    semantic: false,
    dedup: true,
    sort: 'DATE',
    filter: canonicalId
      ? { entityCanonical: [canonicalId] }
      : { entities: [entity] },
  })

  return {
    articles: result.articles,
    page: page + 1,
    found: result.found,
  }
}
