'use server'

import { startOfMonth, subDays } from 'date-fns'
import { cache } from 'react'
import { getPrioritizedArticles } from '@/config/prioritization'
import { loadConfig } from '@/config/prioritization-config'
import { createSSRClient } from '@/lib/graphql/client'
import { withResult } from '@/lib/result'
import { getContentService } from '@/services/content'
import type { ArticleRow } from '@/types/article'

// Conteúdo público não precisa de token de autenticação.
const content = () => getContentService(createSSRClient(async () => null))

// Internal function for fetching latest articles
const fetchLatestArticles = cache(async (): Promise<ArticleRow[]> => {
  try {
    // Carregar configuração de priorização
    const config = await loadConfig()

    // Buscar mais artigos para ter pool maior para scoring
    // (buscamos 50 para garantir diversidade após filtros)
    // O resolver ordena por published_at desc; dedup por content_hash.
    const { articles } = await content().listArticles({
      limit: 50,
      dedup: true,
    })

    // Aplicar priorização
    const prioritized = getPrioritizedArticles(articles, config, 11)

    return prioritized
  } catch (error) {
    console.error('[getLatestArticles] Error applying prioritization:', error)

    // Fallback: retornar ordenação cronológica
    const { articles } = await content().listArticles({
      limit: 11,
      dedup: true,
    })
    return articles
  }
})

// Public API with Result wrapper
export const getLatestArticles = withResult(fetchLatestArticles)

export type GetThemesResult = {
  name: string
  count: number
}[]

// Internal function for fetching themes
const fetchThemes = cache(async (): Promise<GetThemesResult> => {
  try {
    // Carregar configuração de priorização
    const config = await loadConfig()

    const sevenDaysAgo = subDays(new Date(), 7).toISOString()

    // Buscar artigos dos últimos 7 dias.
    // NOTA: usamos `listArticles` (artigos crus) em vez de
    // `getThemeArticleCounts` porque `calculateThemeScores` precisa pontuar
    // cada artigo individualmente (peso de órgão/tema, recência, boosts). O
    // endpoint de contagens só devolve totais — insuficiente para os modos
    // `weighted`/`volume` configurados. Isso preserva o output atual.
    const { articles } = await content().listArticles({
      filter: { startDate: sevenDaysAgo },
      limit: 250, // Buscar mais artigos para melhor análise
    })

    // Usar calculateThemeScores para selecionar temas baseado no modo configurado
    const { calculateThemeScores } = await import('@/config/prioritization')

    // Se modo é manual, retornar direto os temas configurados
    if (config.themeFocusMode === 'manual') {
      return config.manualThemes.map((name: string) => ({ name, count: 0 }))
    }

    // Calcular scores de temas
    const themeScores = calculateThemeScores(articles, config)

    // Ordenar baseado no modo
    if (config.themeFocusMode === 'weighted') {
      themeScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore
        }
        return b.count - a.count
      })
    } else {
      // Modo 'volume'
      themeScores.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return b.avgScore - a.avgScore
      })
    }

    // Retornar top 4 temas (página usa primeiro 3, mas guardamos 1 extra)
    return themeScores.slice(0, 4).map((t) => ({
      name: t.name,
      count: t.count,
    }))
  } catch (error) {
    console.error('[getThemes] Error applying prioritization:', error)

    // Fallback: usar método original (volume) — contagem por tema dos últimos
    // 7 dias, nível 1.
    try {
      const counts = await content().getThemeArticleCounts(7, 1)

      return counts
        .filter((t) => t.label)
        .map((t) => ({ name: t.label as string, count: t.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
    } catch (fallbackError) {
      console.error('[getThemes] Fallback also failed:', fallbackError)
      return []
    }
  }
})

// Public API with Result wrapper
export const getThemes = withResult(fetchThemes)

// Internal function for counting monthly news
const fetchMonthlyNews = cache(async (): Promise<number> => {
  const thisMonth = startOfMonth(new Date()).toISOString()

  const { found } = await content().listArticles({
    limit: 0,
    filter: { startDate: thisMonth },
  })

  return found
})

// Public API with Result wrapper
export const countMonthlyNews = withResult(fetchMonthlyNews)

// Internal function for counting total news
const fetchTotalNews = cache(async (): Promise<number> => {
  const { found } = await content().listArticles({ limit: 0 })

  return found
})

// Public API with Result wrapper
export const countTotalNews = withResult(fetchTotalNews)

// Internal function for fetching articles by theme
const fetchLatestByTheme = cache(
  async (theme: string, limit: number | null): Promise<ArticleRow[]> => {
    if (!theme) return []

    const { articles } = await content().listArticles({
      filter: { themeLabel: theme },
      limit: limit ?? 2,
    })

    return articles
  },
)

// Public API with Result wrapper
export const getLatestByTheme = withResult(fetchLatestByTheme)

// Type for batch theme articles result
export type ThemesWithArticles = Record<string, ArticleRow[]>

// Internal function for fetching articles for multiple themes
const fetchLatestByThemes = cache(
  async (themes: string[], limitPerTheme = 2): Promise<ThemesWithArticles> => {
    if (!themes.length) return {}

    const svc = content()

    // Uma query por tema. A landing é ISR-cacheada, então o loop é aceitável.
    const entries = await Promise.all(
      themes.map(async (theme) => {
        const { articles } = await svc.listArticles({
          filter: { themeLabel: theme },
          limit: limitPerTheme,
          dedup: true,
        })
        return [theme, articles] as const
      }),
    )

    const grouped: ThemesWithArticles = {}
    for (const [theme, articles] of entries) {
      grouped[theme] = articles
    }

    return grouped
  },
)

// Public API with Result wrapper
export const getLatestByThemes = withResult(fetchLatestByThemes)
