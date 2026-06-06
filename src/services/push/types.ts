/**
 * Tipos compartilhados do serviço de push (GraphQL-only).
 */

export interface AgencyOption {
  key: string
  name: string
  type: string
}

export interface PushPreferences {
  agencies: string[]
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}
