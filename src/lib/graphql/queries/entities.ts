/**
 * Operações GraphQL do grafo de entidades (Fase 6d).
 *
 * Alimentam a página `/entidades/[id]`:
 *   - `relatedEntities(id, limit)`: vizinhos por co-menção (1-hop), ordenados por
 *     peso (nº de artigos em co-menção). Origem da seção "Entidades relacionadas".
 *   - `entityNetwork(id, depth, limit)`: ego-network (nós + arestas) da entidade,
 *     consumida pela visualização de rede (`EntityNetwork.tsx`).
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
 * Rede ego-centrada na entidade `id` (nós + arestas) até `depth` saltos. Usada
 * pela visualização de rede. `depth<=2` roda via CTE recursiva em `entity_edges`.
 */
export const ENTITY_NETWORK_QUERY = gql`
  query EntityNetwork($id: String!, $depth: Int!, $limit: Int!) {
    entityNetwork(id: $id, depth: $depth, limit: $limit) {
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
