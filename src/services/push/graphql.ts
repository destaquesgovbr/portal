/**
 * Implementação GraphQL do serviço de push (flag `graphql.push` ON).
 *
 * Usa um `urql` Client para executar queries/mutations equivalentes às
 * rotas REST.
 */

import type { Client } from '@urql/core'
import {
  PUSH_FILTERS_DATA_QUERY,
  PUSH_PREFERENCES_QUERY,
  SYNC_PUSH_SUBSCRIPTION_MUTATION,
  UPDATE_PUSH_PREFERENCES_MUTATION,
} from '@/lib/graphql/queries/push'
import type { PushPreferences, PushSubscriptionPayload } from './rest'
import type { AgencyOption } from './types'

interface PushPreferencesQueryResult {
  pushPreferences: { agencies: string[] } | null
}

interface PushFiltersDataQueryResult {
  pushFiltersData: { agencies: AgencyOption[] }
}

export async function getPushPreferencesViaGraphQL(
  client: Client,
): Promise<PushPreferences> {
  const result = await client
    .query<PushPreferencesQueryResult>(PUSH_PREFERENCES_QUERY, {})
    .toPromise()

  if (result.error) {
    throw result.error
  }
  return { agencies: result.data?.pushPreferences?.agencies ?? [] }
}

export async function updatePushPreferencesViaGraphQL(
  preferences: PushPreferences,
  client: Client,
): Promise<void> {
  const result = await client
    .mutation(UPDATE_PUSH_PREFERENCES_MUTATION, {
      preferences: {
        agencies: preferences.agencies,
        themes: [],
        enabled: true,
      },
    })
    .toPromise()

  if (result.error) {
    throw result.error
  }
}

export async function syncPushSubscriptionViaGraphQL(
  subscription: PushSubscriptionPayload,
  client: Client,
): Promise<void> {
  const result = await client
    .mutation(SYNC_PUSH_SUBSCRIPTION_MUTATION, {
      subscription: {
        endpoint: subscription.endpoint,
        keysP256dh: subscription.keys.p256dh,
        keysAuth: subscription.keys.auth,
      },
    })
    .toPromise()

  if (result.error) {
    throw result.error
  }
}

export async function getPushFiltersDataViaGraphQL(
  client: Client,
): Promise<{ agencies: AgencyOption[] }> {
  const result = await client
    .query<PushFiltersDataQueryResult>(PUSH_FILTERS_DATA_QUERY, {})
    .toPromise()

  if (result.error) {
    throw result.error
  }
  return { agencies: result.data?.pushFiltersData?.agencies ?? [] }
}
