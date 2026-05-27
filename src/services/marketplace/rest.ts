/**
 * Implementação REST do `MarketplaceService` — encapsula os `fetch`
 * espalhados pelos componentes de marketplace em uma única camada.
 *
 * **Comportamento idêntico** ao código original (Fase B3 só extrai; não muda
 * semântica). As rotas REST permanecem ativas e serão removidas só em R1.
 *
 * Aceita injeção de `fetchImpl` para testes.
 */

import type {
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

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export async function listListings(
  query: ListingsQuery = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ListingsPage> {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  const qs = params.toString()
  const url = `/api/clippings/public${qs ? `?${qs}` : ''}`
  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao listar marketplace'))
  }
  return (await res.json()) as ListingsPage
}

export async function getListing(
  listingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListingDetail | null> {
  const res = await fetchImpl(`/api/clippings/public/${listingId}`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao buscar listing'))
  }
  return (await res.json()) as ListingDetail
}

export async function publish(
  payload: PublishPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishResult> {
  const res = await fetchImpl('/api/clippings/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clippingId: payload.clippingId,
      description: payload.description,
      backfillCount: payload.backfillCount ?? 0,
    }),
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao publicar no marketplace'))
  }
  return (await res.json()) as PublishResult
}

export async function unpublish(
  listingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`/api/clippings/public/${listingId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao remover listing'))
  }
}

export async function toggleLike(
  listingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LikeResult> {
  const res = await fetchImpl(`/api/clippings/public/${listingId}/like`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao curtir listing'))
  }
  return (await res.json()) as LikeResult
}

export async function clone(
  listingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CloneResult> {
  const res = await fetchImpl(`/api/clippings/public/${listingId}/clone`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao clonar listing'))
  }
  return (await res.json()) as CloneResult
}

export async function subscribe(
  payload: SubscribeListingPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscribeListingResult> {
  const method = payload.isEditing ? 'PUT' : 'POST'
  const res = await fetchImpl(
    `/api/clippings/public/${payload.listingId}/follow`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryChannels: payload.deliveryChannels,
        extraEmails: payload.extraEmails,
        webhookUrl: payload.webhookUrl,
      }),
    },
  )
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao seguir listing'))
  }
  // POST devolve { ok, subscriptionId }; PUT devolve { ok }
  const body = (await res.json().catch(() => ({}))) as {
    subscriptionId?: string
  }
  return { subscriptionId: body.subscriptionId }
}

export async function unsubscribe(
  listingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`/api/clippings/public/${listingId}/follow`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await readError(res, 'Erro ao deixar de seguir listing'))
  }
}

/**
 * Cria uma implementação REST do `MarketplaceService`, opcionalmente com
 * `fetchImpl` injetado.
 */
export function createRestMarketplaceService(
  fetchImpl?: typeof fetch,
): MarketplaceService {
  // Resolve `fetch` lazy: se nenhum `fetchImpl` for fornecido, cada chamada
  // lê o `globalThis.fetch` atual — assim spies/mocks instalados depois da
  // criação do serviço continuam funcionando nos testes.
  const resolveFetch: typeof fetch = fetchImpl
    ? fetchImpl
    : (((...args) => globalThis.fetch(...args)) as typeof fetch)
  return {
    listListings: (query) => listListings(query, resolveFetch),
    getListing: (id) => getListing(id, resolveFetch),
    publish: (payload) => publish(payload, resolveFetch),
    unpublish: (id) => unpublish(id, resolveFetch),
    toggleLike: (id) => toggleLike(id, resolveFetch),
    clone: (id) => clone(id, resolveFetch),
    subscribe: (payload) => subscribe(payload, resolveFetch),
    unsubscribe: (id) => unsubscribe(id, resolveFetch),
  }
}

export const restMarketplaceService: MarketplaceService =
  createRestMarketplaceService()
