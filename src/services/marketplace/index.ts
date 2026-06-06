/**
 * Facade do serviço de marketplace.
 *
 * GraphQL é o único caminho: todas as operações de marketplace passam pelos
 * resolvers GraphQL (não há mais fallback REST).
 *
 * Há duas formas de consumir o facade:
 *
 *   1. Hook React `useMarketplaceService()`: devolve a implementação GraphQL.
 *      Indicado para client components.
 *
 *   2. `getMarketplaceService(client?)`: factory pura, aceita um urql Client
 *      opcional. Indicado para chamadas server-side (SSR) e para testes.
 *
 * Decisão D2: o conceito de "follow" colapsa em `subscribeToClipping`. A
 * tradução listing → clipping fica no path GraphQL.
 *
 * Os feeds RSS/JSON (`/api/clippings/public/[listingId]/feed.*`) NÃO passam
 * por este facade — continuam servidos diretamente pelo portal.
 */

'use client'

import type { Client } from '@urql/core'
import { useMemo } from 'react'
import { getClient } from '@/lib/graphql/client'
import { createGraphQLMarketplaceService } from './graphql'
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

/**
 * Factory pura — usada em testes e em código server-side. Aceita um urql
 * Client opcional (override para SSR/testes).
 */
export function getMarketplaceService(client?: Client): MarketplaceService {
  return createGraphQLMarketplaceService(client)
}

/**
 * Hook React: devolve a implementação GraphQL do serviço de marketplace.
 * Memoizado para evitar recriação a cada render.
 */
export function useMarketplaceService(): MarketplaceService {
  return useMemo(() => createGraphQLMarketplaceService(getClient()), [])
}
