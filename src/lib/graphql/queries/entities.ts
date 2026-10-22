/**
 * Operações GraphQL do grafo de entidades (Fase 6d).
 *
 * Alimentam a página `/entidades/[id]`:
 *   - `relatedEntities(id, limit)`: vizinhos por co-menção (1-hop), ordenados por
 *     peso (nº de artigos em co-menção). Origem da seção "Entidades relacionadas".
 *   - `entityNetwork(id, depth, limit, egoCentered, maxNodes)`: rede (nós +
 *     arestas) da entidade, consumida pela visualização (`EntityNetwork.tsx`).
 *
 * IDs são `String` (scalar do schema, não `ID`). As listas e o `EntityNetwork`
 * são non-null no retorno; o arg `id` é obrigatório, `limit`/`depth` têm default.
 *
 * Schema de referência: `src/lib/graphql/schema.graphql`.
 */

import { gql } from '@urql/core'

// ---------- Queries ----------

/**
 * Entidades relacionadas a `id` por co-menção (1-hop), ordenadas por `weight`
 * desc. Cada item é o nó vizinho + o peso/tipo da aresta. Roda sobre Postgres
 * (`entity_edges`), sem dependência de Neo4j.
 */
export const RELATED_ENTITIES_QUERY = gql`
  query RelatedEntities($id: String!, $limit: Int!) {
    relatedEntities(id: $id, limit: $limit) {
      canonicalId
      canonicalName
      type
      wikidataId
      weight
      kind
    }
  }
`

/**
 * Rede da entidade `id` (nós + arestas) para a visualização de rede.
 *
 * `egoCentered: false` é o modo legado (CTE recursiva até `depth<=2` saltos,
 * `limit` corta arestas pelo peso global). `egoCentered: true` (GQL-1) devolve
 * o foco + os `maxNodes` vizinhos mais fortes (weight >= 2) com todas as
 * arestas do foco; aí `limit` só corta as arestas entre vizinhos.
 */
export const ENTITY_NETWORK_QUERY = gql`
  query EntityNetwork(
    $id: String!
    $depth: Int!
    $limit: Int!
    $egoCentered: Boolean!
    $maxNodes: Int!
  ) {
    entityNetwork(
      id: $id
      depth: $depth
      limit: $limit
      egoCentered: $egoCentered
      maxNodes: $maxNodes
    ) {
      nodes {
        entityId
        canonicalName
        type
        wikidataId
      }
      edges {
        src
        dst
        weight
        kind
      }
    }
  }
`

// ---------- TypeScript shapes ----------

/** Entidade relacionada (vizinho de co-menção) como vem do graphql-api. */
export interface RelatedEntityGraphQL {
  canonicalId: string
  canonicalName: string | null
  type: string | null
  wikidataId: string | null
  weight: number
  kind: string
}

export interface RelatedEntitiesQueryData {
  relatedEntities: RelatedEntityGraphQL[]
}

/** Nó da rede de entidades (camelCase, graphql-api). */
export interface EntityNetworkNodeGraphQL {
  entityId: string
  canonicalName: string | null
  type: string | null
  wikidataId: string | null
}

/** Aresta da rede de entidades (par direcionado src→dst + peso/tipo). */
export interface EntityNetworkEdgeGraphQL {
  src: string
  dst: string
  weight: number
  kind: string
}

export interface EntityNetworkGraphQL {
  nodes: EntityNetworkNodeGraphQL[]
  edges: EntityNetworkEdgeGraphQL[]
}

export interface EntityNetworkQueryData {
  entityNetwork: EntityNetworkGraphQL
}

/**
 * Artigos de uma entidade canônica via Postgres (`news_entities` → `news`).
 * Não depende do campo `entityCanonical` no Typesense — funciona sem reprocessamento.
 */
export const ENTITY_ARTICLES_QUERY = gql`
  query EntityArticles($entityId: String!, $page: Int, $limit: Int) {
    entityArticles(entityId: $entityId, page: $page, limit: $limit) {
      articles {
        uniqueId
        title
        url
        image
        videoUrl
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
      found
      page
    }
  }
`

export interface EntityArticlesGraphQL {
  articles: import('./articles').ArticleGraphQL[]
  found: number
  page: number
}

export interface EntityArticlesQueryData {
  entityArticles: EntityArticlesGraphQL
}

/**
 * Top entidades NER com maior crescimento de cobertura (pré-computado pelo DAG
 * `compute_entity_trending`). Lê `entity_trending_scores` ordenado por score DESC.
 */
export const TRENDING_ENTITIES_QUERY = gql`
  query TrendingEntities($limit: Int) {
    trendingEntities(limit: $limit) {
      entityId
      canonicalName
      type
      trendingScore
      volumeRatio
      windowCount
      computedAt
    }
  }
`

/** Entidade em alta como vem do graphql-api. */
export interface TrendingEntityGraphQL {
  entityId: string
  canonicalName: string | null
  type: string | null
  trendingScore: number
  volumeRatio: number
  windowCount: number
  computedAt: string | null
}

export interface TrendingEntitiesQueryData {
  trendingEntities: TrendingEntityGraphQL[]
}

/**
 * Lista entidades POLICY com metadados de ontologia (domínio + fase de ciclo de vida).
 * Alimenta a página `/politicas`.
 */
export const POLICIES_QUERY = gql`
  query Policies($domain: String, $lifecyclePhase: String, $limit: Int, $offset: Int) {
    policies(domain: $domain, lifecyclePhase: $lifecyclePhase, limit: $limit, offset: $offset) {
      entityId
      canonicalName
      domain
      lifecyclePhase
      wikidataId
      aliases
      articleCount
    }
  }
`

/** Política pública como vem do graphql-api. */
export interface PolicyGraphQL {
  entityId: string
  canonicalName: string
  domain: string | null
  lifecyclePhase: string | null
  wikidataId: string | null
  aliases: string[]
  articleCount: number
}

export interface PoliciesQueryData {
  policies: PolicyGraphQL[]
}
