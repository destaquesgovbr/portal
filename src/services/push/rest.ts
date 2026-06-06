/**
 * Implementação REST do serviço de push (fallback default, flag OFF).
 *
 * Mantém o comportamento atual das rotas `/api/push/*`. Quando a flag
 * `graphql.push` é OFF, o facade chama estas funções.
 */

import type { AgencyOption } from './types'

export interface PushPreferences {
  agencies: string[]
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/** GET /api/push/preferences */
export async function getPushPreferencesViaRest(
  fetchImpl: typeof fetch = fetch,
): Promise<PushPreferences> {
  const res = await fetchImpl('/api/push/preferences')
  if (!res.ok) {
    if (res.status === 401) {
      // Comportamento atual: sem sessão, sem prefs (UI trata)
      return { agencies: [] }
    }
    throw new Error(`Falha ao ler preferências de push: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { agencies?: string[] }
  return { agencies: data.agencies ?? [] }
}

/** PUT /api/push/preferences */
export async function updatePushPreferencesViaRest(
  preferences: PushPreferences,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl('/api/push/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agencies: preferences.agencies }),
  })
  if (!res.ok) {
    throw new Error(`Falha ao salvar preferências de push: HTTP ${res.status}`)
  }
}

/** POST /api/push/sync */
export async function syncPushSubscriptionViaRest(
  subscription: PushSubscriptionPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl('/api/push/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  if (!res.ok) {
    throw new Error(
      `Falha ao sincronizar push subscription: HTTP ${res.status}`,
    )
  }
}

/** GET /api/push/filters-data */
export async function getPushFiltersDataViaRest(
  fetchImpl: typeof fetch = fetch,
): Promise<{ agencies: AgencyOption[] }> {
  const res = await fetchImpl('/api/push/filters-data')
  if (!res.ok) {
    throw new Error(`Falha ao buscar dados de filtros: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { agencies?: AgencyOption[] }
  return { agencies: data.agencies ?? [] }
}
