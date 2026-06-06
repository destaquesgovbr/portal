/**
 * Facade do serviço de clipping.
 *
 * GraphQL é o único caminho: todas as operações de clipping passam pelos
 * resolvers GraphQL (não há mais fallback REST).
 *
 * Há duas formas de consumir o facade:
 *
 *   1. Hook React `useClippingService()`: devolve a implementação GraphQL.
 *      Indicado para client components.
 *
 *   2. `getClippingService(client?)`: factory pura, aceita um urql Client
 *      opcional. Indicado para chamadas server-side (SSR) e para testes.
 */

'use client'

import type { Client } from '@urql/core'
import { useMemo } from 'react'
import { getClient } from '@/lib/graphql/client'
import { createGraphQLClippingService } from './graphql'
import type { ClippingService } from './types'

export type {
  ClippingService,
  EstimateResult,
  ReleasesPage,
  SubscriptionUpdate,
} from './types'

/**
 * Factory pura — usada em testes e em código server-side. Aceita um urql
 * Client opcional (override para SSR/testes).
 */
export function getClippingService(client?: Client): ClippingService {
  return createGraphQLClippingService(client)
}

/**
 * Hook React: devolve a implementação GraphQL do serviço de clipping.
 * Memoizado para evitar recriação da instância a cada render.
 */
export function useClippingService(): ClippingService {
  return useMemo(() => createGraphQLClippingService(getClient()), [])
}
