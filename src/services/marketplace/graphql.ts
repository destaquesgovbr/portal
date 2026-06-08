/**
 * Implementação GraphQL do `MarketplaceService` (Fase B3).
 *
 * Usa o singleton urql `getClient()`. As operations vivem em
 * `src/lib/graphql/queries/marketplace.ts`.
 *
 * Decisão D2: "follow" é traduzido para `subscribeToClipping`. Como o
 * componente trabalha com `listingId`, fazemos um lookup no listing para
 * descobrir o `sourceClippingId` antes de subscribe/unsubscribe. O lookup é
 * client-side via cache do urql quando possível, ou re-query como fallback.
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import {
  CLONE_FROM_LISTING_MUTATION,
  type CloneFromListingMutationData,
  type FollowedListingGraphQL,
  LIKE_MARKETPLACE_LISTING_MUTATION,
  type LikeMarketplaceListingMutationData,
  MARKETPLACE_LISTING_QUERY,
  MARKETPLACE_LISTING_RELEASES_QUERY,
  MARKETPLACE_LISTINGS_QUERY,
  type MarketplaceListingGraphQL,
  type MarketplaceListingQueryData,
  type MarketplaceListingReleasesQueryData,
  type MarketplaceListingsQueryData,
  MY_FOLLOWED_LISTINGS_QUERY,
  type MyFollowedListingsQueryData,
  PUBLISH_TO_MARKETPLACE_MUTATION,
  type PublishToMarketplaceMutationData,
  SUBSCRIBE_TO_CLIPPING_MUTATION,
  type SubscribeToClippingMutationData,
  UNPUBLISH_FROM_MARKETPLACE_MUTATION,
  UNSUBSCRIBE_FROM_CLIPPING_MUTATION,
  type UnpublishFromMarketplaceMutationData,
  type UnsubscribeFromClippingMutationData,
} from '@/lib/graphql/queries/marketplace'
import type { MarketplaceListing, Release } from '@/types/clipping'
import type {
  CloneResult,
  FollowedListing,
  LikeResult,
  ListingDetail,
  ListingsPage,
  ListingsQuery,
  MarketplaceService,
  PublishPayload,
  PublishResult,
  ReleasesPage,
  SubscribeListingPayload,
  SubscribeListingResult,
} from './types'

// ---------- Adapters: GraphQL ↔ portal types ----------

function mapListing(node: MarketplaceListingGraphQL): MarketplaceListing {
  return {
    id: node.id,
    authorUserId: node.authorUserId,
    authorDisplayName: node.authorDisplayName,
    sourceClippingId: node.sourceClippingId,
    name: node.name,
    description: node.description ?? '',
    recortes: node.recortes.map((r) => ({
      id: r.id,
      title: r.title,
      themes: r.themes ?? [],
      agencies: r.agencies ?? [],
      keywords: r.keywords ?? [],
    })),
    prompt: node.prompt ?? '',
    schedule: node.schedule ?? undefined,
    likeCount: node.likeCount,
    followerCount: node.followerCount,
    cloneCount: node.cloneCount,
    publishedAt: node.publishedAt ?? '',
    updatedAt: node.updatedAt ?? '',
    active: node.active,
  }
}

function mapListingDetail(node: MarketplaceListingGraphQL): ListingDetail {
  return {
    ...mapListing(node),
    userHasLiked: node.hasLiked ?? undefined,
    userFollows: node.hasFollowed ?? undefined,
  }
}

/**
 * Mapeia um `FollowedListing` (GraphQL) → shape consumido pelo `FollowCard`.
 * Os campos escalares do listing reusam o mapeamento de `mapListing`; os campos
 * da subscription (`deliveryChannels`/`extraEmails`/`webhookUrl`/`followedAt`)
 * recebem defaults quando nulos, espelhando o antigo `getFollows`.
 */
function mapFollowedListing(node: FollowedListingGraphQL): FollowedListing {
  return {
    listingId: node.id,
    // `FollowedListing` tem os mesmos campos escalares de `MarketplaceListing`,
    // então reaproveitamos `mapListing` (ignora os campos extras da subscription).
    listing: mapListing(node as unknown as MarketplaceListingGraphQL),
    deliveryChannels: node.deliveryChannels ?? {
      email: false,
      telegram: false,
      push: false,
      webhook: false,
    },
    extraEmails: node.extraEmails ?? [],
    webhookUrl: node.webhookUrl ?? '',
    followedAt: node.followedAt ?? '',
  }
}

function unwrapError(error: unknown, fallback: string): Error {
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      graphQLErrors?: Array<{ message: string }>
    }
    if (e.graphQLErrors?.[0]?.message) {
      return new Error(e.graphQLErrors[0].message)
    }
    if (e.message) {
      return new Error(e.message)
    }
  }
  return new Error(fallback)
}

// ---------- Service ----------

export function createGraphQLMarketplaceService(
  client: Client = getClient(),
): MarketplaceService {
  // Cache local listing → sourceClippingId para evitar roundtrips repetidos
  // no subscribe/unsubscribe (D2). Sobrevive durante a vida do serviço.
  const sourceClippingByListing = new Map<string, string>()

  async function resolveSourceClippingId(listingId: string): Promise<string> {
    const cached = sourceClippingByListing.get(listingId)
    if (cached) return cached
    const result = await client
      .query<MarketplaceListingQueryData>(MARKETPLACE_LISTING_QUERY, {
        id: listingId,
      })
      .toPromise()
    if (result.error) {
      throw unwrapError(result.error, 'Erro ao buscar listing')
    }
    const node = result.data?.marketplaceListing
    if (!node) {
      throw new Error('Listing não encontrado')
    }
    sourceClippingByListing.set(listingId, node.sourceClippingId)
    return node.sourceClippingId
  }

  return {
    async listListings(query: ListingsQuery = {}): Promise<ListingsPage> {
      const result = await client
        .query<MarketplaceListingsQueryData>(MARKETPLACE_LISTINGS_QUERY, {
          page: query.page ?? 1,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao listar marketplace')
      }
      const data = result.data?.marketplaceListings
      const listings = (data?.listings ?? []).map(mapListing)
      return { listings, total: data?.total ?? 0 }
    },

    async listFollowedListings(): Promise<FollowedListing[]> {
      const result = await client
        .query<MyFollowedListingsQueryData>(MY_FOLLOWED_LISTINGS_QUERY, {})
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao listar clippings seguidos')
      }
      const nodes = result.data?.myFollowedListings ?? []
      // Aquece o cache listing → sourceClippingId p/ unsubscribe sem roundtrip.
      for (const node of nodes) {
        sourceClippingByListing.set(node.id, node.sourceClippingId)
      }
      return nodes.map(mapFollowedListing)
    },

    async getListing(listingId: string): Promise<ListingDetail | null> {
      const result = await client
        .query<MarketplaceListingQueryData>(MARKETPLACE_LISTING_QUERY, {
          id: listingId,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao buscar listing')
      }
      const node = result.data?.marketplaceListing
      if (!node) return null
      sourceClippingByListing.set(node.id, node.sourceClippingId)
      return mapListingDetail(node)
    },

    async listListingReleases(
      listingId: string,
      opts: { limit?: number; before?: string } = {},
    ): Promise<ReleasesPage> {
      const limit = opts.limit ?? 10
      const result = await client
        .query<MarketplaceListingReleasesQueryData>(
          MARKETPLACE_LISTING_RELEASES_QUERY,
          { id: listingId, limit: limit + 1, before: opts.before ?? null },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao buscar edições')
      }
      // Listing inativo/inexistente → `marketplaceListing` é null → sem releases.
      const nodes = result.data?.marketplaceListing?.releases ?? []
      const hasMore = nodes.length > limit
      const visible = hasMore ? nodes.slice(0, limit) : nodes
      const releases: Release[] = visible.map((r) => ({
        id: r.id,
        clippingId: r.clippingId,
        userId: '', // não exposto pelo schema GraphQL (conteúdo público)
        clippingName: r.clippingName,
        // `Release` (tipo do portal) não tem campo próprio para o preview; o
        // schema só expõe `digestPreview` (computado no servidor, ≤150 chars).
        // Carregamos o preview em `digest` para que os cards o exibam (mesma
        // convenção do facade de clipping).
        digest: r.digestPreview ?? '',
        digestHtml: r.digestHtml,
        articlesCount: r.articlesCount,
        createdAt: r.createdAt,
        releaseUrl: r.releaseUrl ?? `/clipping/release/${r.id}`,
        refTime: r.refTime,
        sinceHours: r.sinceHours,
      }))
      return { releases, hasMore }
    },

    async publish(payload: PublishPayload): Promise<PublishResult> {
      const result = await client
        .mutation<PublishToMarketplaceMutationData>(
          PUBLISH_TO_MARKETPLACE_MUTATION,
          {
            clippingId: payload.clippingId,
            input: {
              name: '', // schema deriva name do clipping; description é o foco
              description: payload.description,
            },
          },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao publicar no marketplace')
      }
      const node = result.data?.publishToMarketplace
      if (!node) {
        throw new Error('Resposta vazia ao publicar listing')
      }
      sourceClippingByListing.set(node.id, node.sourceClippingId)
      return { listingId: node.id }
    },

    async unpublish(listingId: string): Promise<void> {
      const result = await client
        .mutation<UnpublishFromMarketplaceMutationData>(
          UNPUBLISH_FROM_MARKETPLACE_MUTATION,
          { listingId },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao remover listing')
      }
      sourceClippingByListing.delete(listingId)
    },

    async toggleLike(listingId: string): Promise<LikeResult> {
      const result = await client
        .mutation<LikeMarketplaceListingMutationData>(
          LIKE_MARKETPLACE_LISTING_MUTATION,
          { listingId },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao curtir listing')
      }
      // O schema A3 retorna apenas `liked: bool`. O componente atualiza
      // `likeCount` localmente; aqui devolvemos um delta best-effort.
      const liked = result.data?.likeMarketplaceListing ?? false
      return { liked, likeCount: 0 }
    },

    async clone(listingId: string): Promise<CloneResult> {
      const result = await client
        .mutation<CloneFromListingMutationData>(CLONE_FROM_LISTING_MUTATION, {
          listingId,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao clonar listing')
      }
      // O schema retorna o `Clipping` criado; devolvemos seu id para o caller
      // navegar direto ao novo clipping.
      const cloned = result.data?.cloneMarketplaceListing
      return { id: cloned?.id ?? '' }
    },

    async subscribe(
      payload: SubscribeListingPayload,
    ): Promise<SubscribeListingResult> {
      // D2: tradução listing → clipping para alimentar `SubscribeInput`.
      const clippingId = await resolveSourceClippingId(payload.listingId)
      const result = await client
        .mutation<SubscribeToClippingMutationData>(
          SUBSCRIBE_TO_CLIPPING_MUTATION,
          {
            input: {
              clippingId,
              deliveryChannels: payload.deliveryChannels,
              extraEmails: payload.extraEmails,
              webhookUrl: payload.webhookUrl,
            },
          },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao seguir listing')
      }
      const sub = result.data?.subscribeToClipping
      return { subscriptionId: sub?.id }
    },

    async unsubscribe(listingId: string): Promise<void> {
      const clippingId = await resolveSourceClippingId(listingId)
      const result = await client
        .mutation<UnsubscribeFromClippingMutationData>(
          UNSUBSCRIBE_FROM_CLIPPING_MUTATION,
          { clippingId },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao deixar de seguir listing')
      }
    },
  }
}

export const graphqlMarketplaceService: MarketplaceService =
  createGraphQLMarketplaceService()
