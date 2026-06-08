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

/** Busca (keyword/semântica/híbrida) com filtro, paginação e dedup. */
export const SEARCH_QUERY = gql`
  ${ARTICLE_FIELDS}
  query Search(
    $query: String!
    $filter: ArticleFilter
    $page: Int!
    $semantic: Boolean!
    $alpha: Float
    $dedup: Boolean!
  ) {
    search(
      query: $query
      filter: $filter
      page: $page
      semantic: $semantic
      alpha: $alpha
      dedup: $dedup
    ) {
      articles {
        ...ArticleFields
      }
      page
      found
    }
  }
`

/** Carrega um único artigo pelo `uniqueId`. */
export const ARTICLE_QUERY = gql`
  ${ARTICLE_FIELDS}
  query Article($uniqueId: String!) {
    article(uniqueId: $uniqueId) {
      ...ArticleFields
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
