/**
 * Facade do serviço de clipping (Fase B2 do PLANO-ATUALIZACAO-v2).
 *
 * Cada função roteia para a implementação REST (default) ou GraphQL conforme
 * a flag `graphql.clippings`. Flag default = false: portal continua
 * funcionando exatamente como antes até a flag ser ligada via GrowthBook.
 *
 * Há duas formas de consumir o facade:
 *
 *   1. Hook React `useClippingService()`: lê a flag via `useFeatureFlag`
 *      e devolve uma implementação concreta. Indicado para client components.
 *
 *   2. `getClippingService({ useGraphQL })`: factory pura, recebe a decisão
 *      explícita. Indicado para chamadas server-side (passando a flag já
 *      resolvida) e para testes.
 *
 * As rotas REST permanecem ativas; o cleanup acontece só na Fase R1.
 */

'use client'

import type { Client } from '@urql/core'
import { useMemo } from 'react'
import { GRAPHQL_FLAGS, useFeatureFlag } from '@/lib/feature-flags'
import { createGraphQLClippingService } from './graphql'
import { createRestClippingService, restClippingService } from './rest'
import type { ClippingService } from './types'

export type {
  ClippingService,
  EstimateResult,
  ReleasesPage,
  SubscriptionUpdate,
} from './types'

export interface GetClippingServiceOptions {
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
export function getClippingService(
  opts: GetClippingServiceOptions,
): ClippingService {
  if (opts.useGraphQL) {
    return createGraphQLClippingService(opts.client)
  }
  if (opts.fetchImpl) {
    return createRestClippingService(opts.fetchImpl)
  }
  return restClippingService
}

/**
 * Hook React: lê a flag `graphql.clippings` (default false) e devolve a
 * implementação correspondente. Memoizado para evitar recriação da instância
 * a cada render.
 */
export function useClippingService(): ClippingService {
  const useGraphQL = useFeatureFlag(GRAPHQL_FLAGS.CLIPPINGS, false)
  return useMemo(() => getClippingService({ useGraphQL }), [useGraphQL])
}
