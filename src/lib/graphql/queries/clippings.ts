/**
 * Queries e mutations GraphQL para clipping CRUD (Fase B2).
 *
 * Mapeamento REST → GraphQL:
 *
 *   GET    /api/clipping                  → query myClippings
 *   POST   /api/clipping                  → mutation createClipping(input)
 *   PUT    /api/clipping/[id]             → mutation updateClipping(id, input)
 *   DELETE /api/clipping/[id]             → mutation deleteClipping(id)
 *   POST   /api/clipping/[id]/send        → mutation sendClippingNow(clippingId)
 *   GET    /api/clipping/[id]/releases    → query clipping(id) { releases(...) }
 *   GET    /api/clipping/estimate         → query clippingEstimate(recortes)
 *
 * Canais de entrega (`deliveryChannels`, `extraEmails`, `webhookUrl`) ficam
 * em `Subscription`, NÃO em `Clipping`. Para atualizá-los use a mutation
 * separada `updateMySubscription`.
 *
 * Schema de referência: PLANO-ATUALIZACAO-v2.md §8.1.
 */

import { gql } from '@urql/core'

// ---------- Fragments ----------

const CLIPPING_FIELDS = gql`
  fragment ClippingFields on Clipping {
    id
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
    scheduleTime
    nextRunAt
    startDate
    endDate
    extraEmails
    includeHistory
    authorUserId
    active
    createdAt
    updatedAt
    isAuthor
    publishedToMarketplace
    marketplaceListingId
    mySubscription {
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

// ---------- Queries ----------

/** Lista os clippings do usuário autenticado (autorados + inscritos). */
export const MY_CLIPPINGS_QUERY = gql`
  ${CLIPPING_FIELDS}
  query MyClippings {
    myClippings {
      ...ClippingFields
    }
  }
`

/** Carrega um único clipping pelo ID. */
export const CLIPPING_QUERY = gql`
  ${CLIPPING_FIELDS}
  query Clipping($id: ID!) {
    clipping(id: $id) {
      ...ClippingFields
    }
  }
`

/** Lista releases (edições enviadas) de um clipping. */
export const CLIPPING_RELEASES_QUERY = gql`
  query ClippingReleases($id: ID!, $limit: Int, $before: DateTime) {
    clipping(id: $id) {
      id
      releases(limit: $limit, before: $before) {
        id
        clippingId
        clippingName
        digestHtml
        releaseUrl
        refTime
        sinceHours
        publishedAt
      }
    }
  }
`

/** Estima o número total de artigos para um conjunto de recortes. */
export const CLIPPING_ESTIMATE_QUERY = gql`
  query ClippingEstimate($recortes: [RecorteInput!]!) {
    clippingEstimate(recortes: $recortes) {
      total
      perRecorte
    }
  }
`

// ---------- Mutations ----------

export const CREATE_CLIPPING_MUTATION = gql`
  ${CLIPPING_FIELDS}
  mutation CreateClipping($input: ClippingInput!) {
    createClipping(input: $input) {
      ...ClippingFields
    }
  }
`

export const UPDATE_CLIPPING_MUTATION = gql`
  ${CLIPPING_FIELDS}
  mutation UpdateClipping($id: ID!, $input: ClippingInput!) {
    updateClipping(id: $id, input: $input) {
      ...ClippingFields
    }
  }
`

export const DELETE_CLIPPING_MUTATION = gql`
  mutation DeleteClipping($id: ID!) {
    deleteClipping(id: $id)
  }
`

/**
 * Atualiza canais de entrega (delivery channels) do usuário em um clipping.
 *
 * Schema: subscription separada da entidade `Clipping`. Usuários inscritos
 * (não autor) também usam essa mutation para alterar seus próprios canais.
 */
export const UPDATE_MY_SUBSCRIPTION_MUTATION = gql`
  mutation UpdateMySubscription(
    $clippingId: ID!
    $channels: DeliveryChannelsInput!
    $extraEmails: [String!]
    $webhookUrl: String
  ) {
    updateMySubscription(
      clippingId: $clippingId
      channels: $channels
      extraEmails: $extraEmails
      webhookUrl: $webhookUrl
    ) {
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
      active
    }
  }
`

/** Dispara o envio imediato de um clipping (catchup manual). */
export const SEND_CLIPPING_NOW_MUTATION = gql`
  mutation SendClippingNow($clippingId: ID!) {
    sendClippingNow(clippingId: $clippingId) {
      ok
      dispatched
    }
  }
`

// ---------- TypeScript shapes ----------

export interface RecorteGraphQL {
  id: string
  title: string
  themes: string[]
  agencies: string[]
  keywords: string[]
}

export interface DeliveryChannelsGraphQL {
  email: boolean
  telegram: boolean
  push: boolean
  webhook: boolean
}

export interface UserSubscriptionGraphQL {
  id: string
  role: 'AUTHOR' | 'SUBSCRIBER' | 'author' | 'subscriber'
  deliveryChannels: DeliveryChannelsGraphQL
  extraEmails: string[]
  webhookUrl: string | null
  subscribedAt?: string
  active: boolean
}

export interface ClippingGraphQL {
  id: string
  name: string
  description: string | null
  recortes: RecorteGraphQL[]
  prompt: string | null
  schedule: string
  scheduleTime: string | null
  nextRunAt: string | null
  startDate: string | null
  endDate: string | null
  extraEmails: string[]
  includeHistory: boolean
  authorUserId: string
  active: boolean
  createdAt: string
  updatedAt: string
  isAuthor: boolean
  publishedToMarketplace: boolean
  marketplaceListingId: string | null
  mySubscription: UserSubscriptionGraphQL | null
}

export interface ReleaseGraphQL {
  id: string
  clippingId: string
  clippingName: string
  digestHtml: string
  releaseUrl: string | null
  refTime: string | null
  sinceHours: number | null
  publishedAt: string
}

export interface ClippingInputGraphQL {
  name: string
  description?: string | null
  recortes: RecorteGraphQL[]
  prompt?: string | null
  schedule: string
  startDate?: string | null
  endDate?: string | null
  extraEmails?: string[]
  includeHistory?: boolean
  active?: boolean
}

export interface MyClippingsQueryData {
  myClippings: ClippingGraphQL[]
}

export interface CreateClippingMutationData {
  createClipping: ClippingGraphQL
}

export interface UpdateClippingMutationData {
  updateClipping: ClippingGraphQL
}

export interface DeleteClippingMutationData {
  deleteClipping: boolean
}

export interface UpdateMySubscriptionMutationData {
  updateMySubscription: UserSubscriptionGraphQL
}

export interface SendClippingNowMutationData {
  sendClippingNow: {
    ok: boolean
    dispatched: boolean
  }
}

export interface ClippingEstimateQueryData {
  clippingEstimate: {
    total: number
    perRecorte: number[]
  }
}

export interface ClippingReleasesQueryData {
  clipping: {
    id: string
    releases: ReleaseGraphQL[]
  } | null
}
