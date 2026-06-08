/**
 * Queries GraphQL para widgets embarcáveis (Fase B5).
 *
 * Operações (GraphQL é o único caminho — sem fallback REST):
 *   widgetConfig    → agências e temas do configurador
 *   widgetArticles  → artigos filtrados (consumido pela Server Action do embed)
 *
 * **CORS:** o `graphql-api` já habilita `CORSMiddleware` (`app.py`,
 * `allow_origins` default `*`, métodos GET/POST/OPTIONS), então o
 * configurador (browser, cross-origin) consome o schema público sem
 * problemas. O embed busca artigos server-side (Server Action →
 * `createSSRClient`), sem envolver CORS.
 */

import { gql } from '@urql/core'

/** Lista de agências e temas disponíveis para o widget. */
export const WIDGET_CONFIG_QUERY = gql`
  query WidgetConfig {
    widgetConfig {
      agencies
      themes
    }
  }
`

/** Artigos filtrados para o widget, com paginação. */
export const WIDGET_ARTICLES_QUERY = gql`
  query WidgetArticles($config: WidgetConfigInput!, $page: Int!) {
    widgetArticles(config: $config, page: $page) {
      articles {
        uniqueId
        title
        url
        image
        videoUrl
        content
        summary
        subtitle
        editorialLead
        category
        tags
        agency
        agencyName
        publishedAt
        extractedAt
      }
      pagination {
        page
        limit
        total
        hasMore
      }
    }
  }
`
