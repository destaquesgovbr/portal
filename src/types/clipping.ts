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
  createdAt: string
  updatedAt: string
}

export type ClippingPayload = Omit<Clipping, 'id' | 'createdAt' | 'updatedAt'>
