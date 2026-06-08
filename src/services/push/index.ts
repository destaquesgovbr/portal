/**
 * Facade do serviço de push.
 *
 * GraphQL é o único caminho — não há mais fallback REST. Cada função
 * resolve o `urql` Client (default = singleton `getClient()`) e delega
 * para a implementação GraphQL. Importável server-side (sem `'use client'`).
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import * as graphql from './graphql'
import type {
  AgencyOption,
  PushPreferences,
  PushSubscriptionPayload,
} from './types'

export type {
  AgencyOption,
  PushPreferences,
  PushSubscriptionPayload,
} from './types'

function resolveClient(client?: Client): Client {
  return client ?? getClient()
}

export async function getPushPreferences(
  client?: Client,
): Promise<PushPreferences> {
  return graphql.getPushPreferencesViaGraphQL(resolveClient(client))
}

export async function updatePushPreferences(
  preferences: PushPreferences,
  client?: Client,
): Promise<void> {
  return graphql.updatePushPreferencesViaGraphQL(
    preferences,
    resolveClient(client),
  )
}

export async function syncPushSubscription(
  subscription: PushSubscriptionPayload,
  client?: Client,
): Promise<void> {
  return graphql.syncPushSubscriptionViaGraphQL(
    subscription,
    resolveClient(client),
  )
}

export async function getPushFiltersData(
  client?: Client,
): Promise<{ agencies: AgencyOption[] }> {
  return graphql.getPushFiltersDataViaGraphQL(resolveClient(client))
}
