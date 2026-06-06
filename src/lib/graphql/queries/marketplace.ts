/**
 * Queries e mutations GraphQL para marketplace (Fase B3).
 *
 * Mapeamento REST → GraphQL:
 *
 *   GET    /api/clippings/public                       → query marketplaceListings(page)
 *   GET    /api/clippings/public/[listingId]           → query marketplaceListing(id)
 *   POST   /api/clippings/publish                      → mutation publishToMarketplace(clippingId, input)
 *   DELETE /api/clippings/public/[listingId]           → mutation unpublishFromMarketplace(clippingId)
 *   POST   /api/clippings/public/[listingId]/like      → mutation likeMarketplaceListing(listingId)
 *   POST   /api/clippings/public/[listingId]/clone     → mutation cloneFromListing(listingId)
 *   POST   /api/clippings/public/[listingId]/follow    → mutation subscribeToClipping(input)
 *   PUT    /api/clippings/public/[listingId]/follow    → mutation subscribeToClipping(input) (idempotente)
 *   DELETE /api/clippings/public/[listingId]/follow    → mutation unsubscribeFromClipping(clippingId)
 *
 * Decisão D2: "Follow marketplace" colapsa em `subscribeToClipping`.
 * O input precisa do `clippingId` (`sourceClippingId` da `MarketplaceListing`),
 * não do `listingId`. O facade resolve a tradução listing → clipping.
 *
 * Schema de referência: PLANO-ATUALIZACAO-v2.md §8.1.
 */

import { gql } from '@urql/core'

// ---------- Fragments ----------

const LISTING_FIELDS = gql`
  fragment MarketplaceListingFields on MarketplaceListing {
    id
    authorUserId
    authorDisplayName
    sourceClippingId
    name
    description
    recortes {
      id
      title
      themes
      agencies
      keywords
    }
    prompt
    schedule
    likeCount
    followerCount
    cloneCount
    publishedAt
    updatedAt
    active
    hasLiked
    hasFollowed
  }
`

// ---------- Queries ----------

/** Lista listings do marketplace com paginação. */
export const MARKETPLACE_LISTINGS_QUERY = gql`
  ${LISTING_FIELDS}
  query MarketplaceListings($page: Int) {
    marketplaceListings(page: $page) {
      listings {
        ...MarketplaceListingFields
      }
      total
    }
  }
`

/** Carrega um único listing pelo ID. */
export const MARKETPLACE_LISTING_QUERY = gql`
  ${LISTING_FIELDS}
  query MarketplaceListing($id: String!) {
    marketplaceListing(id: $id) {
      ...MarketplaceListingFields
    }
  }
`

// ---------- Mutations ----------

/** Publica clipping no marketplace. */
export const PUBLISH_TO_MARKETPLACE_MUTATION = gql`
  ${LISTING_FIELDS}
  mutation PublishToMarketplace($clippingId: String!, $input: PublishInput!) {
    publishToMarketplace(clippingId: $clippingId, input: $input) {
      ...MarketplaceListingFields
    }
  }
`

/** Remove um listing do marketplace (somente o autor). */
export const UNPUBLISH_FROM_MARKETPLACE_MUTATION = gql`
  mutation UnpublishFromMarketplace($listingId: String!) {
    unpublishFromMarketplace(listingId: $listingId)
  }
`

/** Curte/descurte um listing. */
export const LIKE_MARKETPLACE_LISTING_MUTATION = gql`
  mutation LikeMarketplaceListing($listingId: String!) {
    likeMarketplaceListing(listingId: $listingId)
  }
`

/** Clona um listing como clipping próprio. Retorna o clipping criado. */
export const CLONE_FROM_LISTING_MUTATION = gql`
  mutation CloneFromListing($listingId: String!) {
    cloneMarketplaceListing(listingId: $listingId) {
      id
      name
    }
  }
`

/**
 * Inscreve o usuário em um clipping (substitui o antigo `followMarketplaceListing`).
 *
 * Decisão D2: o input usa `clippingId` (o `sourceClippingId` da
 * `MarketplaceListing`). É o mesmo endpoint usado pela Fase B2 para a
 * inscrição no clipping próprio — aqui o facade traduz listing → clipping
 * antes de chamar.
 */
export const SUBSCRIBE_TO_CLIPPING_MUTATION = gql`
  mutation SubscribeToClipping($input: SubscribeInput!) {
    subscribeToClipping(input: $input) {
      id
      role
      deliveryChannels {
        email
        telegram
        push
        webhook
      }
      extraEmails
      webhookUrl
      subscribedAt
      active
    }
  }
`

/** Remove a inscrição do usuário em um clipping. */
export const UNSUBSCRIBE_FROM_CLIPPING_MUTATION = gql`
  mutation UnsubscribeFromClipping($clippingId: String!) {
    unsubscribeFromClipping(clippingId: $clippingId)
  }
`

// ---------- Tipos TS dos payloads ----------

export interface MarketplaceRecorteGraphQL {
  id: string
  title: string
  themes: string[]
  agencies: string[]
  keywords: string[]
}

export interface MarketplaceListingGraphQL {
  id: string
  authorUserId: string
  authorDisplayName: string
  sourceClippingId: string
  name: string
  description: string | null
  recortes: MarketplaceRecorteGraphQL[]
  prompt: string | null
  schedule: string | null
  likeCount: number
  followerCount: number
  cloneCount: number
  publishedAt: string | null
  updatedAt: string | null
  active: boolean
  hasLiked: boolean | null
  hasFollowed: boolean | null
}

export interface MarketplaceListingsQueryData {
  marketplaceListings: {
    listings: MarketplaceListingGraphQL[]
    total: number
  }
}

export interface MarketplaceListingQueryData {
  marketplaceListing: MarketplaceListingGraphQL | null
}

export interface PublishInputGraphQL {
  name: string
  description: string | null
}

export interface PublishToMarketplaceMutationData {
  publishToMarketplace: MarketplaceListingGraphQL
}

export interface UnpublishFromMarketplaceMutationData {
  unpublishFromMarketplace: boolean
}

export interface LikeMarketplaceListingMutationData {
  likeMarketplaceListing: boolean
}

export interface CloneFromListingMutationData {
  cloneMarketplaceListing: {
    id: string
    name: string
  }
}

export interface DeliveryChannelsInputGraphQL {
  email: boolean
  telegram: boolean
  push: boolean
  webhook: boolean
}

export interface SubscribeInputGraphQL {
  clippingId: string
  deliveryChannels: DeliveryChannelsInputGraphQL
  extraEmails?: string[]
  webhookUrl?: string
}

export interface UserSubscriptionGraphQL {
  id: string
  role: 'AUTHOR' | 'SUBSCRIBER' | 'author' | 'subscriber'
  deliveryChannels: DeliveryChannelsInputGraphQL
  extraEmails: string[]
  webhookUrl: string | null
  subscribedAt: string
  active: boolean
}

export interface SubscribeToClippingMutationData {
  subscribeToClipping: UserSubscriptionGraphQL
}

export interface UnsubscribeFromClippingMutationData {
  unsubscribeFromClipping: boolean
}
