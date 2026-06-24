/**
 * Tipos do `ContentService` — camada GraphQL de conteúdo público (Fase 2B).
 *
 * As ~10 server actions públicas (notícias, busca, temas, órgãos, artigo,
 * releases, widget…) consomem este facade em vez de falar com o Typesense
 * diretamente. As respostas já vêm mapeadas para `ArticleRow` (snake_case),
 * o contrato que os componentes do portal (`NewsCard`, etc.) já esperam.
 */

import type { ArticleRow } from '@/types/article'

/** Valores do enum `ArticleSort` do schema, usados na ordenação de busca. */
export type ArticleSort = 'RELEVANCE' | 'DATE' | 'TRENDING' | 'VIEWS'

/** Filtro de artigos/busca (espelha `ArticleFilter` do schema). */
export interface ArticleFilterInput {
  agencies?: string[] | null
  themes?: string[] | null
  tags?: string[] | null
  startDate?: string | null
  endDate?: string | null
  themeLabel?: string | null
  dedup?: boolean | null
  /** Textos canônicos de entidades (NER). Depende da Fase 0 (reindex). */
  entities?: string[] | null
  /** Sentimentos: `positive` / `neutral` / `negative`. */
  sentiment?: string[] | null
  /**
   * Ids canônicos de entidades (`Q…`/`dgb_…`) — facet dedup'd por `entity_id`.
   * Usado pelas páginas `/entidades/[id-canônico]`. Depende da canonicalização.
   */
  entityCanonical?: string[] | null
}

export interface ListArticlesArgs {
  page?: number
  limit?: number
  filter?: ArticleFilterInput | null
  dedup?: boolean
}

export interface SearchArticlesArgs {
  query: string
  filter?: ArticleFilterInput | null
  page?: number
  semantic?: boolean
  alpha?: number | null
  dedup?: boolean
  /** Ordenação dos resultados. Ausente → RELEVANCE (default do schema). */
  sort?: ArticleSort | null
}

export interface ArticlesPage {
  articles: ArticleRow[]
  found: number
}

export interface SearchArticlesResult {
  articles: ArticleRow[]
  found: number
  page: number
}

export interface SearchSuggestion {
  uniqueId: string
  title: string
}

export interface ThemeCount {
  code: string
  label: string | null
  count: number
}

/** Facet de entidade: texto canônico + contagem de artigos. */
export interface EntityFacet {
  value: string
  count: number
  /** Id canônico (`Q…`/`dgb_…`) quando o facet já está canonicalizado. */
  entityId?: string | null
  /** Rótulo de exibição (canonical_name) quando disponível. */
  label?: string | null
}

/**
 * Entidade canônica (nó do registry) resolvida por `entity(id)` — cabeçalho das
 * páginas `/entidades/[id-canônico]`.
 */
export interface EntityNode {
  entityId: string
  canonicalName: string | null
  type: string | null
  aliases: string[]
  wikidataId: string | null
  wikidataUrl: string | null
  description: string | null
  agencyKey: string | null
}

/**
 * Entidade relacionada (vizinho de co-menção, 1-hop) — alimenta a seção
 * "Entidades relacionadas" da página `/entidades/[id]`.
 */
export interface RelatedEntity {
  /** Id canônico do vizinho (`Q…`/`dgb_…`) — destino do link da página. */
  canonicalId: string
  canonicalName: string | null
  type: string | null
  wikidataId: string | null
  /** Peso da aresta (nº de artigos em co-menção). */
  weight: number
  /** Tipo da aresta: `co_mention` | `subordinate_to` | `is_agency`. */
  kind: string
}

/** Nó da rede ego-centrada (`entityNetwork`). */
export interface EntityNetworkNode {
  entityId: string
  canonicalName: string | null
  type: string | null
  wikidataId: string | null
}

/** Aresta da rede ego-centrada (par direcionado `src`→`dst`). */
export interface EntityNetworkEdge {
  src: string
  dst: string
  weight: number
  kind: string
}

/** Rede de entidades (nós + arestas) consumida pela visualização. */
export interface EntityNetwork {
  nodes: EntityNetworkNode[]
  edges: EntityNetworkEdge[]
}

/** Entidade NER em alta — alimenta a seção "Entidades em Alta" da homepage. */
export interface TrendingEntity {
  entityId: string
  canonicalName: string
  type: string
  trendingScore: number
  /** Multiplicador de volume: window_daily / baseline_daily. Ex: 3.2 → "↑3.2×" */
  volumeRatio: number
  /** Artigos na janela de 7 dias. */
  windowCount: number
}

export interface EstimateRecorteCountArgs {
  themes: string[]
  agencies: string[]
  keywords: string[]
  sinceHours?: number
}

export interface ContentService {
  /** Lista paginada de artigos com filtro opcional. */
  listArticles(args?: ListArticlesArgs): Promise<ArticlesPage>

  /** Busca (keyword/semântica/híbrida) de artigos. */
  searchArticles(args: SearchArticlesArgs): Promise<SearchArticlesResult>

  /** Carrega um único artigo pelo `uniqueId` (null se não existir). */
  getArticle(uniqueId: string): Promise<ArticleRow | null>

  /** Sugestões de autocomplete para a barra de busca. */
  getSearchSuggestions(query: string): Promise<SearchSuggestion[]>

  /** Artigos relacionados (similaridade semântica). */
  getRelatedArticles(uniqueId: string, limit?: number): Promise<ArticleRow[]>

  /** Contagens de artigos por tema nos últimos N dias. */
  getThemeArticleCounts(days?: number, level?: number): Promise<ThemeCount[]>

  /**
   * Sugestões de entidades (facets) por prefixo, para o typeahead do filtro e
   * para resolver o texto canônico nas páginas de entidade. `type` (ORG/PER/LOC)
   * restringe ao campo tipado. Degrada para `[]` enquanto a Fase 0 não rodar.
   */
  getEntitySuggestions(
    query: string,
    type?: string | null,
    limit?: number,
  ): Promise<EntityFacet[]>

  /**
   * Resolve uma entidade canônica pelo seu id (`Q…`/`dgb_…`). Retorna `null`
   * quando o id não existe. Degrada para `null` enquanto o `entity(id)` não
   * estiver disponível (canonicalização pendente).
   */
  getEntity(id: string): Promise<EntityNode | null>

  /** Artigos que compõem uma release de clipping. */
  getReleaseArticles(id: string): Promise<ArticleRow[]>

  /** Estima a contagem de artigos para um recorte. */
  estimateRecorteCount(args: EstimateRecorteCountArgs): Promise<number>

  /**
   * Entidades relacionadas (co-menção, 1-hop) a uma entidade canônica, por peso.
   * Degrada para `[]` enquanto o grafo (`entity_edges`) não estiver populado.
   */
  getRelatedEntities(id: string, limit?: number): Promise<RelatedEntity[]>

  /**
   * Rede ego-centrada (nós + arestas) de uma entidade canônica, até `depth`
   * saltos. Degrada para uma rede vazia quando o grafo não estiver disponível.
   */
  getEntityNetwork(
    id: string,
    depth?: number,
    limit?: number,
  ): Promise<EntityNetwork>

  /**
   * Top entidades NER com maior crescimento de cobertura (pré-computado). Lê
   * `entity_trending_scores` via graphql-api. Degrada para `[]` enquanto a
   * tabela não existir / o DAG não tiver rodado ainda.
   */
  getTrendingEntities(limit?: number): Promise<TrendingEntity[]>

  /**
   * Artigos de uma entidade canônica via Postgres (`news_entities`). Não depende
   * do campo `entityCanonical` no Typesense — funciona sem reprocessamento.
   */
  getArticlesByEntity(
    entityId: string,
    page?: number,
    limit?: number,
  ): Promise<SearchArticlesResult>
}
