export type Recorte = {
  id: string
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
  recortes: Recorte[]
  prompt: string
  scheduleTime: string
  deliveryChannels: DeliveryChannels
  active: boolean
  extraEmails: string[]
  includeHistory: boolean
  createdAt: string
  updatedAt: string
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
