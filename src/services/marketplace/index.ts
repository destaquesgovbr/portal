/**
 * Facade do serviço de marketplace (Fase B3 do PLANO-ATUALIZACAO-v2).
 *
 * Cada função roteia para a implementação REST (default) ou GraphQL conforme
 * a flag `graphql.marketplace`. Flag default = false: portal continua
 * funcionando exatamente como antes até a flag ser ligada via GrowthBook.
 *
 * Há duas formas de consumir o facade:
 *
 *   1. Hook React `useMarketplaceService()`: lê a flag via `useFeatureFlag`
 *      e devolve uma implementação concreta. Indicado para client components.
 *
 *   2. `getMarketplaceService({ useGraphQL })`: factory pura, recebe a decisão
 *      explícita. Indicado para chamadas server-side (passando a flag já
 *      resolvida) e para testes.
 *
 * Decisão D2: o conceito de "follow" colapsa em `subscribeToClipping`. A
 * tradução listing → clipping fica no path GraphQL; o REST continua usando
 * `/follow` (idempotente: POST cria, PUT atualiza, DELETE remove).
 *
 * As rotas REST permanecem ativas; cleanup acontece só na Fase R1. Os feeds
 * RSS/JSON (`/api/clippings/public/[listingId]/feed.*`) NÃO entram nessa
 * flag — continuam servidos pelo portal mesmo após o flip.
 */

'use client'

import type { Client } from '@urql/core'
import { useMemo } from 'react'
import { GRAPHQL_FLAGS, useFeatureFlag } from '@/lib/feature-flags'
import { createGraphQLMarketplaceService } from './graphql'
import { createRestMarketplaceService, restMarketplaceService } from './rest'
import type { MarketplaceService } from './types'

export type {
  CloneResult,
  LikeResult,
  ListingDetail,
  ListingsPage,
  ListingsQuery,
  MarketplaceService,
  PublishPayload,
  PublishResult,
  SubscribeListingPayload,
  SubscribeListingResult,
} from './types'

export interface GetMarketplaceServiceOptions {
  /** Se true, usa GraphQL; se false, usa REST. */
  useGraphQL: boolean
  /** Override opcional do urql Client (testes/SSR). */
  client?: Client
  /** Override opcional do `fetch` (testes do path REST). */
  fetchImpl?: typeof fetch
}

/**
 * Factory pura — usada em testes e em código que tem a flag já resolvida.
 */
export function getMarketplaceService(
  opts: GetMarketplaceServiceOptions,
): MarketplaceService {
  if (opts.useGraphQL) {
    return createGraphQLMarketplaceService(opts.client)
  }
  if (opts.fetchImpl) {
    return createRestMarketplaceService(opts.fetchImpl)
  }
  return restMarketplaceService
}

/**
 * Hook React: lê a flag `graphql.marketplace` (default false) e devolve a
 * implementação correspondente. Memoizado para evitar recriação a cada render.
 */
export function useMarketplaceService(): MarketplaceService {
  const useGraphQL = useFeatureFlag(GRAPHQL_FLAGS.MARKETPLACE, false)
  return useMemo(() => getMarketplaceService({ useGraphQL }), [useGraphQL])
}
