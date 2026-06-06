/**
 * Queries e mutations GraphQL para push notifications (Fase B5).
 *
 * Mapeamento REST → GraphQL:
 *   GET  /api/push/preferences   → query pushPreferences
 *   PUT  /api/push/preferences   → mutation updatePushPreferences
 *   POST /api/push/sync          → mutation syncPushSubscription
 *   GET  /api/push/filters-data  → query pushFiltersData
 *
 * As queries `pushPreferences` e `pushFiltersData` já existem no schema do
 * `graphql-api` (validado pelo gate de codegen contra o SDL). O facade usa
 * GraphQL quando a flag `graphql.push` está ON; senão, fallback REST.
 */

import { gql } from '@urql/core'

/** Lê preferências de push do usuário autenticado. */
export const PUSH_PREFERENCES_QUERY = gql`
  query PushPreferences {
    pushPreferences {
      agencies
    }
  }
`

/**
 * Lê dados de filtros (agências disponíveis) para o UI de push.
 * O tipo `Agency` do schema expõe `code`/`label`; o service mapeia para o
 * shape `{key,name,type}` que o portal usa (contrato REST legado).
 */
export const PUSH_FILTERS_DATA_QUERY = gql`
  query PushFiltersData {
    pushFiltersData {
      agencies {
        code
        label
      }
    }
  }
`

/** Atualiza preferências (lista de agências) do usuário autenticado. */
export const UPDATE_PUSH_PREFERENCES_MUTATION = gql`
  mutation UpdatePushPreferences($preferences: PushPreferencesInput!) {
    updatePushPreferences(preferences: $preferences)
  }
`

/** Sincroniza uma subscription com o backend (POST /api/push/sync). */
export const SYNC_PUSH_SUBSCRIPTION_MUTATION = gql`
  mutation SyncPushSubscription($subscription: PushSubscriptionInput!) {
    syncPushSubscription(subscription: $subscription)
  }
`
