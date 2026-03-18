import { typesense } from '@/services/typesense/client'
import type { Recorte } from '@/types/clipping'

export const MAX_DAILY_ARTICLES = 100

export function buildFilterBy(
  recorte: Recorte,
  sinceTimestamp: number,
): string {
  const parts: string[] = [`published_at:>=${sinceTimestamp}`]

  if (recorte.themes.length > 0) {
    const themeConditions: string[] = []
    for (const code of recorte.themes) {
      const escaped = code.replace('.', '\\.')
      themeConditions.push(`theme_1_level_1_code:=${escaped}`)
      themeConditions.push(`theme_1_level_2_code:=${escaped}`)
      themeConditions.push(`theme_1_level_3_code:=${escaped}`)
    }
    parts.push(`(${themeConditions.join(' || ')})`)
  }

  if (recorte.agencies.length > 0) {
    const agencyConditions = recorte.agencies
      .map((a) => `agency:=${a}`)
      .join(' || ')
    parts.push(`(${agencyConditions})`)
  }

  return parts.join(' && ')
}

export async function estimateRecorteCount(
  recorte: Recorte,
  sinceHours = 24,
): Promise<number> {
  const sinceTimestamp = Math.floor(Date.now() / 1000) - sinceHours * 3600
  const filterBy = buildFilterBy(recorte, sinceTimestamp)

  const queryTerms = recorte.keywords.length > 0 ? recorte.keywords : ['*']
  let total = 0

  for (const term of queryTerms) {
    const result = await typesense.collections('news').documents().search({
      q: term,
      query_by: 'title,summary',
      filter_by: filterBy,
      per_page: 0,
    })
    total = Math.max(total, result.found ?? 0)
  }

  return total
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
