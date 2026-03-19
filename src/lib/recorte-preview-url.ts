import type { Recorte } from '@/types/clipping'

export function buildRecortePreviewUrl(recorte: Recorte): string | null {
  const hasFilters =
    recorte.themes.length > 0 ||
    recorte.agencies.length > 0 ||
    recorte.keywords.length > 0

  if (!hasFilters) return null

  const params = new URLSearchParams()

  if (recorte.themes.length > 0) {
    params.set('temas', recorte.themes.join(','))
  }
  if (recorte.agencies.length > 0) {
    params.set('agencias', recorte.agencies.join(','))
  }
  if (recorte.keywords.length > 0) {
    params.set('q', recorte.keywords.join('+'))
  }

  return `/busca?${params.toString()}`
}
