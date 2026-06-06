/**
 * Tipos compartilhados entre as implementações REST e GraphQL do serviço de
 * clipping. Mantemos a interface estável para que os componentes do portal
 * não precisem saber qual transport está ativo (a escolha vem da feature
 * flag `graphql.clippings`).
 */

import type {
  Clipping,
  ClippingPayload,
  Recorte,
  Release,
} from '@/types/clipping'

export interface EstimateResult {
  total: number
  perRecorte: number[]
}

export interface ReleasesPage {
  releases: Release[]
  hasMore: boolean
}

/** Dados aceitos por `updateMySubscription` — só canais de entrega. */
export interface SubscriptionUpdate {
  deliveryChannels: {
    email: boolean
    telegram: boolean
    push: boolean
    webhook: boolean
  }
  extraEmails: string[]
  webhookUrl: string
}

export interface ClippingService {
  /** Lista os clippings do usuário autenticado. */
  listClippings(): Promise<Clipping[]>

  /** Cria um novo clipping. */
  createClipping(payload: ClippingPayload): Promise<Clipping>

  /** Atualiza um clipping existente (apenas conteúdo — autoria). */
  updateClipping(id: string, payload: ClippingPayload): Promise<Clipping>

  /** Liga/desliga um clipping (campo `active`; somente o autor). */
  setClippingActive(id: string, active: boolean): Promise<void>

  /** Atualiza somente os canais de entrega do usuário atual no clipping. */
  updateMySubscription(
    clippingId: string,
    update: SubscriptionUpdate,
  ): Promise<void>

  /** Remove um clipping (apenas autor). */
  deleteClipping(id: string): Promise<void>

  /** Estima a quantidade de artigos para um conjunto de recortes. */
  estimate(recortes: Recorte[]): Promise<EstimateResult>

  /** Dispara o envio imediato do clipping (catchup). */
  sendNow(clippingId: string): Promise<void>

  /**
   * Lista releases (edições enviadas) de um clipping.
   *
   * Paginação por cursor `before` (DateTime ISO): o schema GraphQL retorna as
   * releases mais recentes primeiro e usa `before` para buscar as anteriores a
   * um dado instante (em vez de `page`/offset). Para a próxima página, passe o
   * `refTime` (ou `createdAt`) da última release recebida.
   */
  listReleases(
    clippingId: string,
    opts?: { limit?: number; before?: string },
  ): Promise<ReleasesPage>
}
