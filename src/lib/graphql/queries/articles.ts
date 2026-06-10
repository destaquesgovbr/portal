/**
 * Operações GraphQL de conteúdo público (artigos, busca, temas, releases).
 *
 * Estas operações alimentam o facade `src/services/content/` (Fase 2B), que
 * por sua vez é consumido pelas ~10 server actions públicas migradas do
 * Typesense para o GraphQL.
 *
 * Todos os campos do `Article` necessários para o mapper
 * `graphqlArticle → ArticleRow` são selecionados via o fragment
 * `ArticleFields`. IDs são `String` (scalar do schema).
 *
 * Schema de referência: `src/lib/graphql/schema.graphql`.
 */

import { gql } from '@urql/core'

// ---------- Fragment ----------

/**
 * Todos os campos de `Article` que o mapper consome. Selecionar tudo aqui
 * mantém o mapper íntegro independentemente de qual operação trouxe o artigo.
 */
export const ARTICLE_FIELDS = gql`
  fragment ArticleFields on Article {
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
    theme1Level1Code
    theme1Level1Label
    theme1Level2Code
    theme1Level2Label
    theme1Level3Code
    theme1Level3Label
    mostSpecificThemeCode
    mostSpecificThemeLabel
  }
`

// ---------- Queries ----------

/** Lista paginada de artigos com filtro opcional (agências, temas, datas…). */
export const ARTICLES_QUERY = gql`
  ${ARTICLE_FIELDS}
  query Articles($page: Int!, $limit: Int!, $filter: ArticleFilter) {
    articles(page: $page, limit: $limit, filter: $filter) {
      articles {
        ...ArticleFields
      }
      page
      found
    }
  }
`

/** Busca (keyword/semântica/híbrida) com filtro, paginação, dedup e ordenação. */
export const SEARCH_QUERY = gql`
  ${ARTICLE_FIELDS}
  query Search(
    $query: String!
    $filter: ArticleFilter
    $page: Int!
    $semantic: Boolean!
    $alpha: Float
    $dedup: Boolean!
    $sort: ArticleSort
  ) {
    search(
      query: $query
      filter: $filter
      page: $page
      semantic: $semantic
      alpha: $alpha
      dedup: $dedup
      sort: $sort
    ) {
      articles {
        ...ArticleFields
      }
      page
      found
    }
  }
`

/**
 * Sugestões de entidades (facets) para o typeahead do filtro de busca e para
 * resolver o texto canônico de uma entidade nas páginas `/entidades/[slug]`.
 *
 * ⚠️ Depende de campos Typesense (`entities`/`entity_org`/…) que só existem
 * após a Fase 0 (reindex de produção). Até lá, retorna vazio/erro graciosamente
 * — o facade `getEntitySuggestions` engole o erro e devolve `[]`.
 */
export const ENTITY_SUGGESTIONS_QUERY = gql`
  query EntitySuggestions($query: String!, $type: String, $limit: Int!) {
    entitySuggestions(query: $query, type: $type, limit: $limit) {
      value
      count
    }
  }
`

/**
 * Carrega um único artigo pelo `uniqueId`, incluindo as features computadas
 * (entidades, leitura/legibilidade, popularidade/trending). O bloco `features`
 * fica SÓ aqui — não no fragment `ArticleFields` — para não onerar
 * listas/busca/relacionadas, que não selecionam features.
 */
export const ARTICLE_QUERY = gql`
  ${ARTICLE_FIELDS}
  query Article($uniqueId: String!) {
    article(uniqueId: $uniqueId) {
      ...ArticleFields
      features {
        entities {
          text
          type
          count
        }
        viewCount
        uniqueSessions
        trendingScore
        wordCount
        readabilityFlesch
      }
    }
  }
`

/** Sugestões de autocomplete para a barra de busca. */
export const SEARCH_SUGGESTIONS_QUERY = gql`
  query SearchSuggestions($query: String!) {
    searchSuggestions(query: $query) {
      uniqueId
      title
    }
  }
`

/** Artigos relacionados a um dado artigo (similaridade semântica). */
export const RELATED_ARTICLES_QUERY = gql`
  ${ARTICLE_FIELDS}
  query RelatedArticles($uniqueId: String!, $limit: Int!) {
    relatedArticles(uniqueId: $uniqueId, limit: $limit) {
      ...ArticleFields
    }
  }
`

/** Contagens de artigos por tema nos últimos N dias (nível da hierarquia). */
export const THEME_ARTICLE_COUNTS_QUERY = gql`
  query ThemeArticleCounts($days: Int!, $level: Int!) {
    themeArticleCounts(days: $days, level: $level) {
      code
      label
      count
    }
  }
`

/** Artigos que compõem uma release de clipping. */
export const RELEASE_ARTICLES_QUERY = gql`
  ${ARTICLE_FIELDS}
  query ReleaseArticles($id: String!) {
    releaseArticles(id: $id) {
      ...ArticleFields
    }
  }
`

/** Estima a contagem de artigos para um recorte (themes/agencies/keywords). */
export const ESTIMATE_RECORTE_COUNT_QUERY = gql`
  query EstimateRecorteCount(
    $themes: [String!]!
    $agencies: [String!]!
    $keywords: [String!]!
    $sinceHours: Int!
  ) {
    estimateRecorteCount(
      themes: $themes
      agencies: $agencies
      keywords: $keywords
      sinceHours: $sinceHours
    )
  }
`

// ---------- TypeScript shapes ----------

/** Valores do enum `ArticleSort` do schema, usados na ordenação de busca. */
export type ArticleSort = 'RELEVANCE' | 'DATE' | 'TRENDING' | 'VIEWS'

/** Facet de entidade (texto canônico + contagem) do `entitySuggestions`. */
export interface EntityFacetGraphQL {
  value: string
  count: number
}

export interface EntitySuggestionsQueryData {
  entitySuggestions: EntityFacetGraphQL[]
}

/** Features computadas, como vêm do graphql-api (camelCase). Só no detalhe. */
export interface ArticleFeaturesGraphQL {
  entities: Array<{ text: string; type: string; count: number }>
  viewCount: number | null
  uniqueSessions: number | null
  trendingScore: number | null
  wordCount: number | null
  readabilityFlesch: number | null
}

/** Artigo camelCase como vem do graphql-api (espelha o fragment acima). */
export interface ArticleGraphQL {
  uniqueId: string
  title: string | null
  url: string | null
  image: string | null
  videoUrl: string | null
  content: string | null
  summary: string | null
  subtitle: string | null
  editorialLead: string | null
  category: string | null
  tags: string[] | null
  agency: string | null
  agencyName: string | null
  publishedAt: string | null
  extractedAt: string | null
  theme1Level1Code: string | null
  theme1Level1Label: string | null
  theme1Level2Code: string | null
  theme1Level2Label: string | null
  theme1Level3Code: string | null
  theme1Level3Label: string | null
  mostSpecificThemeCode: string | null
  mostSpecificThemeLabel: string | null
  // Presente apenas em ARTICLE_QUERY (detalhe do artigo).
  features?: ArticleFeaturesGraphQL | null
}

export interface ArticlesResultGraphQL {
  articles: ArticleGraphQL[]
  page: number
  found: number
}

export interface SearchSuggestionGraphQL {
  uniqueId: string
  title: string
}

export interface ThemeCountGraphQL {
  code: string
  label: string | null
  count: number
}

export interface ArticlesQueryData {
  articles: ArticlesResultGraphQL
}

export interface SearchQueryData {
  search: ArticlesResultGraphQL
}

export interface ArticleQueryData {
  article: ArticleGraphQL | null
}

export interface SearchSuggestionsQueryData {
  searchSuggestions: SearchSuggestionGraphQL[]
}

export interface RelatedArticlesQueryData {
  relatedArticles: ArticleGraphQL[]
}

export interface ThemeArticleCountsQueryData {
  themeArticleCounts: ThemeCountGraphQL[]
}

export interface ReleaseArticlesQueryData {
  releaseArticles: ArticleGraphQL[]
}

export interface EstimateRecorteCountQueryData {
  estimateRecorteCount: number
}
