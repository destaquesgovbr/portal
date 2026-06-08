/**
 * Tipos compartilhados entre as implementações REST e GraphQL do serviço de
 * marketplace. Mantemos a interface estável para que os componentes do portal
 * não precisem saber qual transport está ativo (a escolha vem da feature
 * flag `graphql.marketplace`).
 *
 * Nota sobre D2 (PLANO-ATUALIZACAO-v2 §3): o conceito antigo "follow" colapsa
 * em `subscribe` no schema GraphQL. Para evitar churn nos componentes,
 * o facade expõe `subscribe` / `unsubscribe` baseados em `listingId` e
 * resolve internamente para o `clippingId` (`sourceClippingId`) quando o
 * transport é GraphQL.
 */

import type {
  DeliveryChannels,
  MarketplaceListing,
  Release,
} from '@/types/clipping'

export interface ListingsPage {
  listings: MarketplaceListing[]
  total: number
}

/**
 * Listing que o usuário autenticado segue, com os campos da subscription dele.
 * Espelha o shape `FollowedListing` consumido pelo `FollowCard` — substitui o
 * antigo `getFollows` (Firestore). `listing` reusa o `MarketplaceListing` do
 * portal; os demais campos vêm da subscription.
 */
export interface FollowedListing {
  listingId: string
  listing: MarketplaceListing
  deliveryChannels: DeliveryChannels
  extraEmails: string[]
  webhookUrl: string
  followedAt: string
}

export interface ReleasesPage {
  releases: Release[]
  hasMore: boolean
}

export interface ListingsQuery {
  page?: number
  limit?: number
}

export interface ListingDetail extends MarketplaceListing {
  /** Personalização do usuário autenticado (quando há sessão). */
  userHasLiked?: boolean
  userFollows?: boolean
}

export interface PublishPayload {
  clippingId: string
  description: string
  /** Quantidade de releases passados a gerar (0 = nenhum). */
  backfillCount?: number
}

export interface PublishResult {
  /** ID do novo listing criado. */
  listingId: string
}

export interface SubscribeListingPayload {
  /** ID do `MarketplaceListing` (interface do componente). */
  listingId: string
  deliveryChannels: DeliveryChannels
  extraEmails: string[]
  webhookUrl: string
  /** Se true, trata como update; se false, criação. (REST distingue POST/PUT.) */
  isEditing?: boolean
}

export interface SubscribeListingResult {
  subscriptionId?: string
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface CloneResult {
  /** ID do novo clipping criado. */
  id: string
}

export interface MarketplaceService {
  /** Lista listings públicos com paginação. */
  listListings(query?: ListingsQuery): Promise<ListingsPage>

  /**
   * Lista os listings que o usuário autenticado segue, com os campos da
   * subscription dele. Substitui o `getFollows` do portal (Firestore).
   */
  listFollowedListings(): Promise<FollowedListing[]>

  /** Carrega um único listing. */
  getListing(listingId: string): Promise<ListingDetail | null>

  /**
   * Lista as releases (edições) PÚBLICAS de um listing ativo.
   *
   * Caminho público sem auth — usa o campo `MarketplaceListing.releases` do
   * graphql-api (só expõe releases de listing `active`). Paginação por cursor
   * `before` (DateTime ISO): para a próxima página, passe o `refTime`/
   * `createdAt` da release mais antiga já recebida.
   */
  listListingReleases(
    listingId: string,
    opts?: { limit?: number; before?: string },
  ): Promise<ReleasesPage>

  /** Publica um clipping no marketplace. */
  publish(payload: PublishPayload): Promise<PublishResult>

  /** Remove um listing do marketplace (somente o autor). */
  unpublish(listingId: string): Promise<void>

  /** Curte/descurte um listing. Retorna estado final. */
  toggleLike(listingId: string): Promise<LikeResult>

  /** Clona o listing como clipping próprio. */
  clone(listingId: string): Promise<CloneResult>

  /**
   * Subscreve o usuário ao clipping representado pelo listing. Quando
   * `isEditing` é true, atualiza canais; caso contrário, cria a inscrição.
   * (D2: "follow" → `subscribeToClipping`.)
   */
  subscribe(payload: SubscribeListingPayload): Promise<SubscribeListingResult>

  /** Remove a inscrição do usuário no listing. */
  unsubscribe(listingId: string): Promise<void>
}
