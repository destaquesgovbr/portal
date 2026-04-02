export type Recorte = {
  id: string
  title: string
  themes: string[]
  agencies: string[]
  keywords: string[]
}

export type DeliveryChannels = {
  email: boolean
  telegram: boolean
  push: boolean
  webhook: boolean
}

export type Clipping = {
  id: string
  name: string
  description?: string
  recortes: Recorte[]
  prompt: string
  schedule: string
  scheduleTime?: string // legacy — clippings antigos usam este campo
  nextRunAt?: string | null
  startDate?: string | null
  endDate?: string | null
  deliveryChannels: DeliveryChannels
  active: boolean
  extraEmails: string[]
  webhookUrl?: string
  includeHistory: boolean
  createdAt: string
  updatedAt: string
  // Marketplace
  publishedToMarketplace?: boolean
  marketplaceListingId?: string | null
  clonedFrom?: string | null
}

export type MarketplaceFollower = {
  userId: string
  deliveryChannels: DeliveryChannels
  extraEmails: string[]
  webhookUrl: string
  followedAt: string
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
  schedule?: string
  coverImageUrl?: string
  publishedAt: string
  updatedAt: string
  active: boolean
}

export type Subscription = {
  id: string
  clippingId: string
  userId: string
  role: 'author' | 'subscriber'
  deliveryChannels: DeliveryChannels
  extraEmails: string[]
  webhookUrl: string
  subscribedAt: string
  active: boolean
}

export type ClippingPayload = Omit<
  Clipping,
  'id' | 'createdAt' | 'updatedAt'
> & {
  webhookUrl: string
}

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
