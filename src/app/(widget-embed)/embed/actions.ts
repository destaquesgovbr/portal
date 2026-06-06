'use server'

import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { createSSRClient } from '@/lib/graphql/client'
import { getWidgetArticles } from '@/services/widgets'
import type { ArticleRow } from '@/types/article'
import type { WidgetConfig } from '@/types/widget'

export interface FetchWidgetArticlesResult {
  articles: ArticleRow[]
  agencyNames: Record<string, string>
  themeNames: Record<string, string>
}

/**
 * Shape camelCase devolvido por `widgetArticles` (graphql-api).
 *
 * Atenção: a query NÃO traz os campos `theme_1_level_*` que o `ArticleRow`
 * possui — apenas `category`. O mapper usa `category` como rótulo de tema
 * (badge do card), que é o único campo de tema disponível.
 */
interface GraphqlWidgetArticle {
  uniqueId?: string | null
  title?: string | null
  url?: string | null
  image?: string | null
  videoUrl?: string | null
  content?: string | null
  summary?: string | null
  subtitle?: string | null
  editorialLead?: string | null
  category?: string | null
  tags?: string[] | null
  agency?: string | null
  agencyName?: string | null
  publishedAt?: string | null
  extractedAt?: string | null
}

/**
 * Converte uma data ISO (formato do GraphQL) para timestamp Unix em segundos,
 * que é o que `ArticleRow.published_at` espera (e `formatDateTime` multiplica
 * por 1000). Retorna `null` para entradas ausentes ou inválidas.
 */
function isoToUnixSeconds(iso?: string | null): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

/**
 * Converte um artigo camelCase do GraphQL para o `ArticleRow` (snake_case)
 * consumido pelo embed/`WidgetNewsCard`. Campos não fornecidos pela query
 * recebem defaults sensíveis (`null`).
 *
 * O `WidgetNewsCard`/`embed/page` lê apenas: `unique_id`, `title`, `summary`,
 * `theme_1_level_1_label` (badge), `published_at`, `image`. Os demais campos
 * são preenchidos para manter o contrato completo do `ArticleRow`.
 */
function mapGraphqlArticleToRow(article: GraphqlWidgetArticle): ArticleRow {
  const category = article.category ?? null
  return {
    unique_id: article.uniqueId ?? '',
    agency: article.agency ?? null,
    published_at: isoToUnixSeconds(article.publishedAt),
    title: article.title ?? null,
    url: article.url ?? null,
    image: article.image ?? null,
    video_url: article.videoUrl ?? null,
    category,
    content: article.content ?? null,
    summary: article.summary ?? null,
    subtitle: article.subtitle ?? null,
    editorial_lead: article.editorialLead ?? null,
    extracted_at: isoToUnixSeconds(article.extractedAt),
    // A query não retorna hierarquia de temas; usamos `category` como rótulo
    // de tema para o badge do card renderizar como antes.
    theme_1_level_1_code: null,
    theme_1_level_1_label: category,
    theme_1_level_2_code: null,
    theme_1_level_2_label: null,
    theme_1_level_3_code: null,
    theme_1_level_3_label: null,
    most_specific_theme_code: null,
    most_specific_theme_label: category,
    published_year: null,
    published_month: null,
    published_week: null,
    tags: article.tags ?? null,
    theme_1_level_1: category,
  }
}

/**
 * Busca artigos para o widget baseado na configuração.
 *
 * O fetch de artigos vai por GraphQL (server→server via `createSSRClient`,
 * sem auth, sem CORS). Os nomes de agências/temas continuam vindo dos dados
 * locais (`getAgenciesList`/`getThemesWithHierarchy`).
 */
export async function fetchWidgetArticles(
  config: WidgetConfig,
): Promise<FetchWidgetArticlesResult> {
  const { agencies, themes, articlesPerPage } = config

  const { articles: graphqlArticles } = await getWidgetArticles(
    {
      agencies: agencies && agencies.length > 0 ? agencies : undefined,
      themes: themes && themes.length > 0 ? themes : undefined,
      limit: articlesPerPage,
      page: 1,
    },
    createSSRClient(),
  )

  // A query já pagina, mas mantemos o slice por segurança.
  const articles = (graphqlArticles as GraphqlWidgetArticle[])
    .slice(0, articlesPerPage)
    .map(mapGraphqlArticleToRow)

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
