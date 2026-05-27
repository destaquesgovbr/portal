/**
 * Implementação REST do serviço de widgets (fallback default).
 *
 * Preserva o caching ISR de 5 minutos (`revalidate=300` nas rotas REST)
 * — quando chamado client-side, o cache é responsabilidade do Next.js
 * para a rota subjacente.
 */

import type {
  WidgetArticlesData,
  WidgetArticlesFilter,
  WidgetConfigData,
} from './types'

export async function getWidgetConfigViaRest(
  fetchImpl: typeof fetch = fetch,
): Promise<WidgetConfigData> {
  const res = await fetchImpl('/api/widgets/config')
  if (!res.ok) {
    throw new Error(`Falha ao buscar config do widget: HTTP ${res.status}`)
  }
  const data = (await res.json()) as WidgetConfigData
  return {
    agencies: data.agencies ?? [],
    themes: data.themes ?? [],
  }
}

export async function getWidgetArticlesViaRest(
  filter: WidgetArticlesFilter,
  fetchImpl: typeof fetch = fetch,
): Promise<WidgetArticlesData> {
  const params = new URLSearchParams()
  if (filter.agencies?.length) {
    params.set('agencies', filter.agencies.join(','))
  }
  if (filter.themes?.length) {
    params.set('themes', filter.themes.join(','))
  }
  if (filter.limit !== undefined) {
    params.set('limit', String(filter.limit))
  }
  if (filter.page !== undefined) {
    params.set('page', String(filter.page))
  }

  const url =
    params.size > 0
      ? `/api/widgets/articles?${params.toString()}`
      : '/api/widgets/articles'

  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(`Falha ao buscar artigos do widget: HTTP ${res.status}`)
  }
  const data = (await res.json()) as WidgetArticlesData
  return {
    articles: data.articles ?? [],
    pagination: data.pagination,
  }
}
