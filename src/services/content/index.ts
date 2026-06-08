/**
 * Facade do serviço de conteúdo público (artigos/busca/temas/releases).
 *
 * GraphQL é o único caminho. Há duas formas de consumir:
 *
 *   1. `getContentService(client?)`: factory pura, aceita um urql Client
 *      opcional. Indicada para server actions (SSR — passe `createSSRClient()`)
 *      e para testes.
 *
 *   2. Hook React `useContentService()`: devolve a implementação GraphQL com o
 *      cliente singleton do browser. Indicado para client components.
 *
 * O mapper compartilhado `mapGraphqlArticleToRow` também é reexportado aqui.
 */

'use client'

import type { Client } from '@urql/core'
import { useMemo } from 'react'
import { getClient } from '@/lib/graphql/client'
import { createGraphQLContentService, mapGraphqlArticleToRow } from './graphql'
import type { ContentService } from './types'

export { mapGraphqlArticleToRow }

export type {
  ArticleFilterInput,
  ArticlesPage,
  ContentService,
  EstimateRecorteCountArgs,
  ListArticlesArgs,
  SearchArticlesArgs,
  SearchArticlesResult,
  SearchSuggestion,
  ThemeCount,
} from './types'

/**
 * Factory pura — usada em server actions (SSR) e em testes. Aceita um urql
 * Client opcional (override para SSR/testes).
 */
export function getContentService(client?: Client): ContentService {
  return createGraphQLContentService(client)
}

/**
 * Hook React: devolve a implementação GraphQL do serviço de conteúdo.
 * Memoizado para evitar recriação a cada render.
 */
export function useContentService(): ContentService {
  return useMemo(() => createGraphQLContentService(getClient()), [])
}
