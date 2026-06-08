import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { Recorte } from '@/types/clipping'

export const MAX_DAILY_ARTICLES = 100

export function hasFilters(recorte: Recorte): boolean {
  return (
    recorte.themes.length > 0 ||
    recorte.agencies.length > 0 ||
    recorte.keywords.length > 0
  )
}

/**
 * Estima a contagem de artigos para um recorte via facade GraphQL.
 *
 * O resolver `estimateRecorteCount` é público e calcula a contagem real no
 * servidor (max entre as keywords, dentro da janela `sinceHours`). Estas
 * funções rodam server-side (route handlers `/api/clipping/*` e Server
 * Components), por isso usamos o cliente SSR (sem token — resolver público).
 */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

export async function estimateRecorteCount(
  recorte: Recorte,
  sinceHours = 24,
): Promise<number> {
  if (!hasFilters(recorte)) return 0

  return content().estimateRecorteCount({
    themes: recorte.themes,
    agencies: recorte.agencies,
    keywords: recorte.keywords,
    sinceHours,
  })
}

export async function estimateTotalCount(
  recortes: Recorte[],
): Promise<{ total: number; perRecorte: number[] }> {
  const perRecorte: number[] = []
  let total = 0

  for (const recorte of recortes) {
    const count = await estimateRecorteCount(recorte)
    perRecorte.push(count)
    total += count
  }

  return { total, perRecorte }
}
