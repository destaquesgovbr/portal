/**
 * Implementação REST do `ClippingService` — encapsula as chamadas `fetch`
 * que antes ficavam espalhadas pelos componentes do portal.
 *
 * **Comportamento idêntico** ao código original (Fase B2 só extrai; não muda
 * semântica). As rotas REST permanecem ativas e serão removidas só na Fase R1
 * de cleanup.
 *
 * Aceita injeção de `fetchImpl` para testes; default é o `fetch` global.
 */

import type { Clipping, ClippingPayload, Recorte } from '@/types/clipping'
import type {
  ClippingService,
  EstimateResult,
  ReleasesPage,
  SubscriptionUpdate,
} from './types'

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export async function listClippings(
  fetchImpl: typeof fetch = fetch,
): Promise<Clipping[]> {
  const res = await fetchImpl('/api/clipping')
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao carregar clippings'))
  }
  return (await res.json()) as Clipping[]
}

export async function createClipping(
  payload: ClippingPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<Clipping> {
  const res = await fetchImpl('/api/clipping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Falha ao criar clipping'))
  }
  return (await res.json()) as Clipping
}

export async function updateClipping(
  id: string,
  payload: ClippingPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<Clipping> {
  const res = await fetchImpl(`/api/clipping/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Falha ao atualizar clipping'))
  }
  return (await res.json()) as Clipping
}

export async function updateMySubscription(
  clippingId: string,
  update: SubscriptionUpdate,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  // No REST, canais são enviados via PATCH no próprio clipping. Os componentes
  // atuais embarcam isso no PUT do clipping; o facade expõe a operação
  // separada para alinhar a API com o GraphQL — a rota REST aceita PATCH
  // (toggle/active) e ignora silenciosamente o que não conhece.
  const res = await fetchImpl(`/api/clipping/${clippingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deliveryChannels: update.deliveryChannels,
      extraEmails: update.extraEmails,
      webhookUrl: update.webhookUrl,
    }),
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Falha ao atualizar canais'))
  }
}

export async function setClippingActive(
  id: string,
  active: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`/api/clipping/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Falha ao alterar status do clipping'))
  }
}

export async function deleteClipping(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`/api/clipping/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await readError(res, 'Falha ao excluir clipping'))
  }
}

export async function estimate(
  recortes: Recorte[],
  fetchImpl: typeof fetch = fetch,
): Promise<EstimateResult> {
  const res = await fetchImpl(
    `/api/clipping/estimate?recortes=${encodeURIComponent(JSON.stringify(recortes))}`,
  )
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao buscar estimativa'))
  }
  return (await res.json()) as EstimateResult
}

export async function sendNow(
  clippingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`/api/clipping/${clippingId}/send`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(`Send failed: ${res.status}`)
  }
}

export async function listReleases(
  clippingId: string,
  opts: { page?: number; limit?: number } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ReleasesPage> {
  const params = new URLSearchParams()
  if (opts.page !== undefined) params.set('page', String(opts.page))
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  const qs = params.toString()
  const url = `/api/clipping/${clippingId}/releases${qs ? `?${qs}` : ''}`
  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao buscar edições'))
  }
  return (await res.json()) as ReleasesPage
}

/**
 * Cria uma implementação REST do `ClippingService`, opcionalmente com
 * `fetchImpl` injetado para testes.
 */
export function createRestClippingService(
  fetchImpl: typeof fetch = fetch,
): ClippingService {
  return {
    listClippings: () => listClippings(fetchImpl),
    createClipping: (payload) => createClipping(payload, fetchImpl),
    updateClipping: (id, payload) => updateClipping(id, payload, fetchImpl),
    setClippingActive: (id, active) => setClippingActive(id, active, fetchImpl),
    updateMySubscription: (clippingId, update) =>
      updateMySubscription(clippingId, update, fetchImpl),
    deleteClipping: (id) => deleteClipping(id, fetchImpl),
    estimate: (recortes) => estimate(recortes, fetchImpl),
    sendNow: (clippingId) => sendNow(clippingId, fetchImpl),
    listReleases: (clippingId, opts) =>
      listReleases(clippingId, opts, fetchImpl),
  }
}

/** Instância default (usa fetch global). */
export const restClippingService: ClippingService = createRestClippingService()
