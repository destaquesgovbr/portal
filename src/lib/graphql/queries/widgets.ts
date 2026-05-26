/**
 * Queries GraphQL para widgets embarcáveis (Fase B5).
 *
 * Mapeamento REST → GraphQL:
 *   GET /api/widgets/config    → query widgetConfig
 *   GET /api/widgets/articles  → query widgetArticles
 *
 * **CORS:** o endpoint `/api/widgets/articles` é embarcado por iframes
 * externos (CORS aberto). O endpoint `/graphql` do `graphql-api` ainda
 * NÃO tem CORS configurado (`app.py` não inclui `CORSMiddleware`). Até
 * isso ser resolvido, a flag `graphql.widgets` permanece OFF em produção
 * e o fallback REST cobre o caso de uso externo. Caso a flag seja
 * ligada para o configurador (mesma origem), o browser não exige CORS.
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
