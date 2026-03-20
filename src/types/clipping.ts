export type Recorte = {
  id: string
  title?: string
  themes: string[]
  agencies: string[]
  keywords: string[]
}

export type DeliveryChannels = {
  email: boolean
  telegram: boolean
  push: boolean
}

export type Clipping = {
  id: string
  name: string
  description?: string
  recortes: Recorte[]
  prompt: string
  scheduleTime: string
  deliveryChannels: DeliveryChannels
  active: boolean
  extraEmails: string[]
  includeHistory: boolean
  createdAt: string
  updatedAt: string
  // Marketplace
  publishedToMarketplace?: boolean
  marketplaceListingId?: string | null
  followsListingId?: string | null
  followsAuthorUserId?: string | null
  clonedFrom?: string | null
}

export type MarketplaceListing = {
  id: string
  authorUserId: string
  authorDisplayName: string
  sourceClippingId: string
  name: string
  description: string
  recortes: Recorte[]
  prompt: string
  likeCount: number
  followerCount: number
  cloneCount: number
  publishedAt: string
  updatedAt: string
  active: boolean
}

export type ClippingPayload = Omit<Clipping, 'id' | 'createdAt' | 'updatedAt'>

export type Release = {
  id: string
  clippingId: string
  userId: string
  clippingName: string
  digest: string
  digestHtml: string
  articlesCount: number
  createdAt: string
  releaseUrl: string
}
