/**
 * Facade do serviço de push.
 *
 * Padrão idêntico ao da Fase B2 (clippings): cada função roteia para
 * REST ou GraphQL conforme a flag `graphql.push` no momento da chamada.
 * Default (flag indisponível ou falha) = REST (fail-safe).
 *
 * O caller decide se está em contexto client (passa `useGraphQL`
 * vindo de `useFeatureFlag`) ou server (passa um boolean qualquer).
 * O facade não chama hooks — é puramente de runtime.
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import * as graphql from './graphql'
import type { PushPreferences, PushSubscriptionPayload } from './rest'
import * as rest from './rest'
import type { AgencyOption } from './types'

export type { PushPreferences, PushSubscriptionPayload } from './rest'
export type { AgencyOption } from './types'

export interface PushFacadeOptions {
  /** Se true, usa GraphQL; se false, usa REST. */
  useGraphQL: boolean
  /** Override do urql Client (testes / SSR). */
  client?: Client
  /** Override do fetch (testes). */
  fetchImpl?: typeof fetch
}

function resolveClient(client?: Client): Client {
  return client ?? getClient()
}

export async function getPushPreferences(
  opts: PushFacadeOptions,
): Promise<PushPreferences> {
  if (opts.useGraphQL) {
    return graphql.getPushPreferencesViaGraphQL(resolveClient(opts.client))
  }
  return rest.getPushPreferencesViaRest(opts.fetchImpl)
}

export async function updatePushPreferences(
  preferences: PushPreferences,
  opts: PushFacadeOptions,
): Promise<void> {
  if (opts.useGraphQL) {
    return graphql.updatePushPreferencesViaGraphQL(
      preferences,
      resolveClient(opts.client),
    )
  }
  return rest.updatePushPreferencesViaRest(preferences, opts.fetchImpl)
}

export async function syncPushSubscription(
  subscription: PushSubscriptionPayload,
  opts: PushFacadeOptions,
): Promise<void> {
  if (opts.useGraphQL) {
    return graphql.syncPushSubscriptionViaGraphQL(
      subscription,
      resolveClient(opts.client),
    )
  }
  return rest.syncPushSubscriptionViaRest(subscription, opts.fetchImpl)
}

export async function getPushFiltersData(
  opts: PushFacadeOptions,
): Promise<{ agencies: AgencyOption[] }> {
  if (opts.useGraphQL) {
    return graphql.getPushFiltersDataViaGraphQL(resolveClient(opts.client))
  }
  return rest.getPushFiltersDataViaRest(opts.fetchImpl)
}
