'use server'

import { queryArticles } from '@/app/(public)/busca/actions'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import type { ArticleRow } from '@/types/article'
import type { WidgetConfig } from '@/types/widget'

export interface FetchWidgetArticlesResult {
  articles: ArticleRow[]
  agencyNames: Record<string, string>
  themeNames: Record<string, string>
}

/**
 * Busca artigos para o widget baseado na configuração
 */
export async function fetchWidgetArticles(
  config: WidgetConfig,
): Promise<FetchWidgetArticlesResult> {
  const { agencies, themes, articlesPerPage } = config

  // Buscar artigos usando a função existente
  const result = await queryArticles({
    page: 0, // Primeira página
    query: '',
    agencies: agencies && agencies.length > 0 ? agencies : undefined,
    themes: themes && themes.length > 0 ? themes : undefined,
    // Sem filtro de data - sempre mostra recentes
    startDate: undefined,
    endDate: undefined,
  })

  // Limita os resultados ao número especificado
  const articles = result.articles.slice(0, articlesPerPage)

  // Buscar nomes de agências e temas para tooltips
  const [agenciesList, themesList] = await Promise.all([
    getAgenciesList(),
    getThemesWithHierarchy(),
  ])

  const agencyNames: Record<string, string> = {}
  for (const agency of agenciesList) {
    agencyNames[agency.key] = agency.name
  }

  const themeNames: Record<string, string> = {}
  for (const theme of themesList) {
    themeNames[theme.key] = theme.name
  }

  return {
    articles,
    agencyNames,
    themeNames,
  }
}
