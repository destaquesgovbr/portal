/**
 * Implementação GraphQL do `ClippingService` (Fase B2).
 *
 * Usa o singleton urql `getClient()` configurado em `src/lib/graphql/client.ts`.
 * As operations vivem em `src/lib/graphql/queries/clippings.ts`.
 *
 * **Validação cron client-side** acontece antes de enviar (`createClipping`,
 * `updateClipping`) — replica o comportamento do schema GraphQL (A4) e
 * evita roundtrip desnecessário em entradas inválidas.
 */

import type { Client } from '@urql/core'
import { isValidCron } from '@/lib/cron-utils'
import { getClient } from '@/lib/graphql/client'
import {
  CLIPPING_ESTIMATE_QUERY,
  CLIPPING_RELEASES_QUERY,
  type ClippingEstimateQueryData,
  type ClippingGraphQL,
  type ClippingInputGraphQL,
  type ClippingReleasesQueryData,
  CREATE_CLIPPING_MUTATION,
  type CreateClippingMutationData,
  DELETE_CLIPPING_MUTATION,
  type DeleteClippingMutationData,
  MY_CLIPPINGS_QUERY,
  type MyClippingsQueryData,
  RELEASE_BY_ID_QUERY,
  type ReleaseByIdQueryData,
  SEND_CLIPPING_NOW_MUTATION,
  SET_CLIPPING_ACTIVE_MUTATION,
  type SendClippingNowMutationData,
  type SetClippingActiveMutationData,
  UPDATE_CLIPPING_MUTATION,
  UPDATE_MY_SUBSCRIPTION_MUTATION,
  type UpdateClippingMutationData,
  type UpdateMySubscriptionMutationData,
  type UserSubscriptionGraphQL,
} from '@/lib/graphql/queries/clippings'
import type {
  Clipping,
  ClippingPayload,
  Recorte,
  Release,
} from '@/types/clipping'
import type {
  ClippingService,
  EstimateResult,
  ReleasesPage,
  ReleaseWithContext,
  SubscriptionUpdate,
} from './types'

// ---------- Adapters: GraphQL ↔ portal types ----------

function mapSubscription(sub: UserSubscriptionGraphQL | null | undefined): {
  subscriptionId?: string
  deliveryChannels: Clipping['deliveryChannels']
  extraEmails: string[]
  webhookUrl: string
} {
  if (!sub) {
    return {
      deliveryChannels: {
        email: false,
        telegram: false,
        push: false,
        webhook: false,
      },
      extraEmails: [],
      webhookUrl: '',
    }
  }
  return {
    subscriptionId: sub.id,
    deliveryChannels: { ...sub.deliveryChannels },
    extraEmails: sub.extraEmails ?? [],
    webhookUrl: sub.webhookUrl ?? '',
  }
}

function mapClipping(node: ClippingGraphQL): Clipping {
  const sub = mapSubscription(node.mySubscription)
  return {
    id: node.id,
    name: node.name,
    description: node.description ?? undefined,
    recortes: node.recortes.map((r) => ({
      id: r.id,
      title: r.title,
      themes: r.themes ?? [],
      agencies: r.agencies ?? [],
      keywords: r.keywords ?? [],
    })),
    prompt: node.prompt ?? '',
    schedule: node.schedule,
    scheduleTime: node.scheduleTime ?? undefined,
    nextRunAt: node.nextRunAt ?? null,
    startDate: node.startDate ?? null,
    endDate: node.endDate ?? null,
    deliveryChannels: sub.deliveryChannels,
    active: node.active,
    extraEmails: sub.extraEmails,
    webhookUrl: sub.webhookUrl,
    includeHistory: node.includeHistory,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    publishedToMarketplace: node.publishedToMarketplace,
    marketplaceListingId: node.marketplaceListingId,
  }
}

function payloadToInput(payload: ClippingPayload): ClippingInputGraphQL {
  // RecorteInput do schema não tem `id`; ClippingInput não tem `active`.
  return {
    name: payload.name,
    description: payload.description ?? null,
    recortes: payload.recortes.map((r) => ({
      title: r.title,
      themes: r.themes,
      agencies: r.agencies,
      keywords: r.keywords,
    })),
    prompt: payload.prompt || null,
    schedule: payload.schedule,
    startDate: payload.startDate ?? null,
    endDate: payload.endDate ?? null,
    extraEmails: payload.extraEmails ?? [],
    includeHistory: payload.includeHistory ?? false,
  }
}

function payloadToSubscription(payload: ClippingPayload): SubscriptionUpdate {
  return {
    deliveryChannels: payload.deliveryChannels,
    extraEmails: payload.extraEmails ?? [],
    webhookUrl: payload.webhookUrl ?? '',
  }
}

/** Lê o erro mais útil de um `OperationResult` do urql. */
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

/**
 * Cria a implementação GraphQL com injeção de cliente para facilitar testes.
 *
 * @param client Cliente urql. Default: `getClient()` (singleton browser).
 */
export function createGraphQLClippingService(
  client: Client = getClient(),
): ClippingService {
  return {
    async listClippings(): Promise<Clipping[]> {
      const result = await client
        .query<MyClippingsQueryData>(MY_CLIPPINGS_QUERY, {})
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao carregar clippings')
      }
      const nodes = result.data?.clippings ?? []
      return nodes.map(mapClipping)
    },

    async createClipping(payload: ClippingPayload): Promise<Clipping> {
      if (!isValidCron(payload.schedule)) {
        throw new Error('Expressão cron inválida')
      }
      const result = await client
        .mutation<CreateClippingMutationData>(CREATE_CLIPPING_MUTATION, {
          input: payloadToInput(payload),
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Falha ao criar clipping')
      }
      const node = result.data?.createClipping
      if (!node) {
        throw new Error('Resposta vazia ao criar clipping')
      }
      // Após criar, se houver canais a aplicar e a mutation não os tiver
      // persistido (schema A4 separa subscription), sincronizamos via
      // updateMySubscription. O server pode ter feito isso já — best effort.
      const sub = payloadToSubscription(payload)
      const hasChannels =
        sub.deliveryChannels.email ||
        sub.deliveryChannels.telegram ||
        sub.deliveryChannels.push ||
        sub.deliveryChannels.webhook
      if (hasChannels) {
        try {
          await this.updateMySubscription(node.id, sub)
        } catch (err) {
          // best-effort: criação ocorreu; canais podem ser ajustados depois
          console.warn('createClipping: updateMySubscription falhou', err)
        }
      }
      return mapClipping(node)
    },

    async updateClipping(
      id: string,
      payload: ClippingPayload,
    ): Promise<Clipping> {
      if (!isValidCron(payload.schedule)) {
        throw new Error('Expressão cron inválida')
      }
      const result = await client
        .mutation<UpdateClippingMutationData>(UPDATE_CLIPPING_MUTATION, {
          id,
          input: payloadToInput(payload),
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Falha ao atualizar clipping')
      }
      const node = result.data?.updateClipping
      if (!node) {
        throw new Error('Resposta vazia ao atualizar clipping')
      }
      // Espelhamos canais como em create: schema separa Clipping de
      // Subscription, portanto sync separado.
      try {
        await this.updateMySubscription(id, payloadToSubscription(payload))
      } catch (err) {
        console.warn('updateClipping: updateMySubscription falhou', err)
      }
      return mapClipping(node)
    },

    async updateMySubscription(
      clippingId: string,
      update: SubscriptionUpdate,
    ): Promise<void> {
      const result = await client
        .mutation<UpdateMySubscriptionMutationData>(
          UPDATE_MY_SUBSCRIPTION_MUTATION,
          {
            clippingId,
            channels: update.deliveryChannels,
            extraEmails: update.extraEmails,
            webhookUrl: update.webhookUrl,
          },
        )
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Falha ao atualizar canais')
      }
    },

    async deleteClipping(id: string): Promise<void> {
      const result = await client
        .mutation<DeleteClippingMutationData>(DELETE_CLIPPING_MUTATION, { id })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Falha ao excluir clipping')
      }
    },

    async setClippingActive(id: string, active: boolean): Promise<void> {
      const result = await client
        .mutation<SetClippingActiveMutationData>(SET_CLIPPING_ACTIVE_MUTATION, {
          id,
          active,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Falha ao alterar status do clipping')
      }
    },

    async estimate(recortes: Recorte[]): Promise<EstimateResult> {
      // O schema expõe `clippingEstimate(themes, agencies, keywords)` (estimativa
      // única). Montamos a estimativa por-recorte chamando uma vez por recorte
      // e somando o total. Em paralelo para minimizar latência.
      const perRecorteResults = await Promise.all(
        recortes.map(async (r) => {
          const result = await client
            .query<ClippingEstimateQueryData>(CLIPPING_ESTIMATE_QUERY, {
              themes: r.themes,
              agencies: r.agencies,
              keywords: r.keywords,
            })
            .toPromise()
          if (result.error) {
            throw unwrapError(result.error, 'Erro ao estimar contagem')
          }
          return result.data?.clippingEstimate?.totalEstimate ?? 0
        }),
      )
      return {
        total: perRecorteResults.reduce((acc, n) => acc + n, 0),
        perRecorte: perRecorteResults,
      }
    },

    async sendNow(clippingId: string): Promise<void> {
      const result = await client
        .mutation<SendClippingNowMutationData>(SEND_CLIPPING_NOW_MUTATION, {
          id: clippingId,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao enviar clipping')
      }
    },

    async listReleases(
      clippingId: string,
      opts: { limit?: number; before?: string } = {},
    ): Promise<ReleasesPage> {
      const limit = opts.limit ?? 10
      const result = await client
        .query<ClippingReleasesQueryData>(CLIPPING_RELEASES_QUERY, {
          id: clippingId,
          limit: limit + 1,
          before: opts.before ?? null,
        })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao buscar edições')
      }
      const nodes = result.data?.clipping?.releases ?? []
      const hasMore = nodes.length > limit
      const visible = hasMore ? nodes.slice(0, limit) : nodes
      const releases: Release[] = visible.map((r) => ({
        id: r.id,
        clippingId: r.clippingId,
        userId: '', // não exposto pelo schema GraphQL (autor é resolvido contextualmente)
        clippingName: r.clippingName,
        // `Release` (tipo do portal) não tem campo próprio para o preview; o
        // schema só expõe `digestPreview` (computado no servidor, ≤150 chars),
        // não o `digest` cru. Carregamos o preview em `digest` para que os
        // consumidores SSR (release-utils) o usem sem alterar o tipo `Release`.
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

    async getReleaseById(id: string): Promise<ReleaseWithContext | null> {
      const result = await client
        .query<ReleaseByIdQueryData>(RELEASE_BY_ID_QUERY, { id })
        .toPromise()
      if (result.error) {
        throw unwrapError(result.error, 'Erro ao buscar release')
      }
      const r = result.data?.release
      // null = release inexistente OU sem autorização (semântica do resolver).
      if (!r) return null
      return {
        id: r.id,
        clippingId: r.clippingId,
        userId: '', // não exposto pelo schema GraphQL (autor resolvido contextualmente)
        clippingName: r.clippingName,
        digest: '', // schema só expõe digestHtml/digestPreview, não o texto puro
        digestHtml: r.digestHtml,
        digestPreview: r.digestPreview ?? null,
        articlesCount: r.articlesCount,
        createdAt: r.createdAt,
        releaseUrl: r.releaseUrl ?? `/clipping/release/${r.id}`,
        refTime: r.refTime,
        sinceHours: r.sinceHours,
        // O resolver `Release` agora expõe `recortes` (filtros do clipping fonte)
        // e `marketplaceListingId` (listing ativo, ou null) para o caller
        // autorizado — selecionados por `RELEASE_BY_ID_QUERY`.
        recortes: (r.recortes ?? []).map((rec) => ({
          id: rec.id,
          title: rec.title,
          themes: rec.themes ?? [],
          agencies: rec.agencies ?? [],
          keywords: rec.keywords ?? [],
        })),
        marketplaceListingId: r.marketplaceListingId ?? null,
      }
    },
  }
}

/** Instância pronta para uso client-side. */
export const graphqlClippingService: ClippingService =
  createGraphQLClippingService()
