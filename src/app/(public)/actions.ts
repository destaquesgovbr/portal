'use server'

import { startOfMonth, subDays } from 'date-fns'
import { cache } from 'react'
import { getPrioritizedArticles } from '@/config/prioritization'
import { loadConfig } from '@/config/prioritization-config'
import { withResult } from '@/lib/result'
import { typesense } from '@/services/typesense/client'
import type { ArticleRow } from '@/types/article'

// Internal function for fetching latest articles
const fetchLatestArticles = cache(async (): Promise<ArticleRow[]> => {
  try {
    // Carregar configuração de priorização
    const config = await loadConfig()

    // Buscar mais artigos para ter pool maior para scoring
    // (buscamos 50 para garantir diversidade após filtros)
    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        limit: 50,
        sort_by: 'published_at:desc',
        group_by: 'content_hash',
        group_limit: 1,
      })

    const articles = result.grouped_hits?.flatMap((group) =>
      group.hits.map((hit) => hit.document),
    ) as ArticleRow[]

    // Aplicar priorização
    const prioritized = getPrioritizedArticles(articles, config, 11)

    return prioritized
  } catch (error) {
    console.error('[getLatestArticles] Error applying prioritization:', error)

    // Fallback: retornar ordenação cronológica
    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        limit: 11,
        sort_by: 'published_at:desc',
        group_by: 'content_hash',
        group_limit: 1,
      })
    return result.grouped_hits?.flatMap((group) =>
      group.hits.map((hit) => hit.document),
    ) as ArticleRow[]
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

    const sevenDaysAgo = subDays(new Date(), 7).getTime()

    // Buscar artigos dos últimos 7 dias
    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        filter_by: `published_at:>${Math.floor(sevenDaysAgo / 1000)}`,
        limit: 250, // Buscar mais artigos para melhor análise
        sort_by: 'published_at:desc',
      })

    const articles = result.hits?.map((hit) => hit.document) as ArticleRow[]

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

    // Fallback: usar método original (volume)
    const sevenDaysAgo = subDays(new Date(), 7).getTime()

    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        group_by: 'theme_1_level_1_label',
        filter_by: `published_at:>${Math.floor(sevenDaysAgo / 1000)}`,
        limit: 26,
      })

    const themesCount: Record<string, number> = {}

    for (const group of result.grouped_hits ?? []) {
      themesCount[group.group_key[0]] = group.found ?? 0
    }

    delete themesCount.undefined
    delete themesCount['']

    const countResult = Object.keys(themesCount)
      .map((themeName) => ({ name: themeName, count: themesCount[themeName] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)

    return countResult
  }
})

// Public API with Result wrapper
export const getThemes = withResult(fetchThemes)

// Internal function for counting monthly news
const fetchMonthlyNews = cache(async (): Promise<number> => {
  const thisMonth = startOfMonth(new Date()).getTime() / 1000

  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: '*',
      filter_by: `published_at:>${thisMonth}`,
    })

  return result.found
})

// Public API with Result wrapper
export const countMonthlyNews = withResult(fetchMonthlyNews)

// Internal function for counting total news
const fetchTotalNews = cache(async (): Promise<number> => {
  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: '*',
      limit: 0,
    })

  return result.found
})

// Public API with Result wrapper
export const countTotalNews = withResult(fetchTotalNews)

// Internal function for fetching articles by theme
const fetchLatestByTheme = cache(
  async (theme: string, limit: number | null): Promise<ArticleRow[]> => {
    if (!theme) return []

    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        filter_by: `theme_1_level_1_label:=${theme}`,
        sort_by: 'published_at:desc',
        limit: limit ?? 2,
      })

    return result.hits?.map((hit) => hit.document) as ArticleRow[]
  },
)

// Public API with Result wrapper
export const getLatestByTheme = withResult(fetchLatestByTheme)

// Type for batch theme articles result
export type ThemesWithArticles = Record<string, ArticleRow[]>

// Internal function for fetching articles for multiple themes in a single query
const fetchLatestByThemes = cache(
  async (themes: string[], limitPerTheme = 2): Promise<ThemesWithArticles> => {
    if (!themes.length) return {}

    // Single query with group_by for all themes
    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        filter_by: `theme_1_level_1_label:[${themes.join(',')}]`,
        group_by: 'theme_1_level_1_label',
        group_limit: limitPerTheme,
        sort_by: 'published_at:desc',
        limit: themes.length * limitPerTheme,
      })

    // Transform grouped results into a record
    const grouped: ThemesWithArticles = {}
    for (const group of result.grouped_hits ?? []) {
      const themeName = group.group_key[0]
      grouped[themeName] = (group.hits?.map((h) => h.document) ??
        []) as ArticleRow[]
    }

    return grouped
  },
)

// Public API with Result wrapper
export const getLatestByThemes = withResult(fetchLatestByThemes)
