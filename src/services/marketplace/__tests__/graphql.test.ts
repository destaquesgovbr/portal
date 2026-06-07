/**
 * Testes da implementação GraphQL do `MarketplaceService` (Fase B3).
 *
 * Cobre listagens, detalhes, publish/unpublish, like, clone e o colapso
 * (D2) do antigo "follow marketplace" em `subscribeToClipping`/
 * `unsubscribeFromClipping` — incluindo a tradução listing → clipping.
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import { createGraphQLMarketplaceService } from '../graphql'

// ---------- Helpers ----------

interface Op {
  query: string
  vars: unknown
}

function makeClientStub(handlers: {
  onQuery?: (query: string, vars: unknown) => unknown
  onMutation?: (query: string, vars: unknown) => unknown
  queryError?: unknown
  mutationError?: unknown
}): { client: Client; queries: Op[]; mutations: Op[] } {
  const queries: Op[] = []
  const mutations: Op[] = []

  const client = {
    query: (doc: { loc?: { source?: { body: string } } }, vars: unknown) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        queries.push({ query: body, vars })
        return {
          data: handlers.onQuery?.(body, vars) ?? {},
          error: handlers.queryError,
        }
      },
    }),
    mutation: (
      doc: { loc?: { source?: { body: string } } },
      vars: unknown,
    ) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        mutations.push({ query: body, vars })
        return {
          data: handlers.onMutation?.(body, vars) ?? {},
          error: handlers.mutationError,
        }
      },
    }),
  } as unknown as Client

  return { client, queries, mutations }
}

function makeListingNode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l-1',
    authorUserId: 'u-1',
    authorDisplayName: 'Author One',
    sourceClippingId: 'c-1',
    name: 'Listing 1',
    description: 'desc',
    recortes: [
      {
        id: 'r1',
        title: 'Recorte 1',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: null,
    likeCount: 3,
    followerCount: 2,
    cloneCount: 1,
    publishedAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    active: true,
    hasLiked: false,
    hasFollowed: false,
    ...overrides,
  }
}

const CHANNELS = {
  email: true,
  telegram: false,
  push: false,
  webhook: false,
}

describe('createGraphQLMarketplaceService', () => {
  it('test_marketplaceList_uses_graphql_when_flag_on: dispara MarketplaceListings', async () => {
    const { client, queries } = makeClientStub({
      onQuery: (q) => {
        if (q.includes('MarketplaceListings')) {
          return {
            marketplaceListings: {
              listings: [makeListingNode()],
              total: 1,
            },
          }
        }
        return {}
      },
    })

    const service = createGraphQLMarketplaceService(client)
    const result = await service.listListings({ page: 1 })

    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('MarketplaceListings')
    expect(queries[0].vars).toMatchObject({ page: 1 })
    expect(result.total).toBe(1)
    expect(result.listings).toHaveLength(1)
    expect(result.listings[0]).toMatchObject({
      id: 'l-1',
      name: 'Listing 1',
      likeCount: 3,
      followerCount: 2,
      cloneCount: 1,
      active: true,
    })
  })

  it('test_marketplaceListing_detail_via_graphql: dispara MarketplaceListing(id)', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        marketplaceListing: makeListingNode({
          hasLiked: true,
          hasFollowed: true,
        }),
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    const detail = await service.getListing('l-1')

    expect(queries[0].vars).toMatchObject({ id: 'l-1' })
    expect(detail).not.toBeNull()
    expect(detail).toMatchObject({
      id: 'l-1',
      userHasLiked: true,
      userFollows: true,
    })
  })

  it('detail null quando GraphQL retorna marketplaceListing null', async () => {
    const { client } = makeClientStub({
      onQuery: () => ({ marketplaceListing: null }),
    })
    const service = createGraphQLMarketplaceService(client)
    const detail = await service.getListing('inexistente')
    expect(detail).toBeNull()
  })

  it('listListingReleases: dispara MarketplaceListingReleases(id) e mapeia releases públicas', async () => {
    const release = (id: string) => ({
      id,
      clippingId: 'src-1',
      clippingName: 'Top Economia',
      digestHtml: `<p>${id}</p>`,
      articlesCount: 8,
      releaseUrl: `/clipping/release/${id}`,
      refTime: '2026-05-26T08:00:00Z',
      sinceHours: 24,
      createdAt: '2026-05-26T08:01:00Z',
    })
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        marketplaceListing: {
          id: 'l-1',
          releases: [release('rel-1'), release('rel-2'), release('rel-3')],
        },
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    const result = await service.listListingReleases('l-1', { limit: 2 })

    expect(queries[0].query).toContain('MarketplaceListingReleases')
    expect(queries[0].query).toContain('articlesCount')
    // pede limit+1 para detectar hasMore.
    expect(queries[0].vars).toMatchObject({ id: 'l-1', limit: 3, before: null })
    expect(result.releases).toHaveLength(2)
    expect(result.hasMore).toBe(true)
    expect(result.releases[0].articlesCount).toBe(8)
    expect(result.releases[0].digestHtml).toBe('<p>rel-1</p>')
  })

  it('listListingReleases: listing inativo/inexistente (null) → sem releases', async () => {
    const { client } = makeClientStub({
      onQuery: () => ({ marketplaceListing: null }),
    })
    const service = createGraphQLMarketplaceService(client)
    const result = await service.listListingReleases('inativo')
    expect(result.releases).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('listListingReleases: encaminha o cursor before', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ marketplaceListing: { id: 'l-1', releases: [] } }),
    })
    const service = createGraphQLMarketplaceService(client)
    await service.listListingReleases('l-1', { before: '2026-05-26T08:00:00Z' })
    expect(queries[0].vars).toMatchObject({
      id: 'l-1',
      before: '2026-05-26T08:00:00Z',
    })
  })

  it('test_publishToMarketplace_via_graphql: chama PublishToMarketplace', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({
        publishToMarketplace: makeListingNode({ id: 'new-listing' }),
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    const result = await service.publish({
      clippingId: 'c-42',
      description: 'Minha descrição',
      backfillCount: 0,
    })

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('PublishToMarketplace')
    expect(mutations[0].vars).toMatchObject({
      clippingId: 'c-42',
      input: { description: 'Minha descrição' },
    })
    expect(result).toEqual({ listingId: 'new-listing' })
  })

  it('test_unpublishFromMarketplace_via_graphql: chama UnpublishFromMarketplace', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ unpublishFromMarketplace: true }),
    })

    const service = createGraphQLMarketplaceService(client)
    await service.unpublish('l-9')

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('UnpublishFromMarketplace')
    expect(mutations[0].vars).toMatchObject({ listingId: 'l-9' })
  })

  it('test_subscribeToClipping_from_listing_via_graphql: traduz listingId → clippingId via getListing antes de SubscribeToClipping', async () => {
    const { client, queries, mutations } = makeClientStub({
      onQuery: () => ({
        marketplaceListing: makeListingNode({
          id: 'l-99',
          sourceClippingId: 'c-source-99',
        }),
      }),
      onMutation: () => ({
        subscribeToClipping: {
          id: 'sub-1',
          role: 'SUBSCRIBER',
          deliveryChannels: CHANNELS,
          extraEmails: [],
          webhookUrl: '',
          subscribedAt: '2026-05-26T12:00:00Z',
          active: true,
        },
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    const result = await service.subscribe({
      listingId: 'l-99',
      deliveryChannels: CHANNELS,
      extraEmails: [],
      webhookUrl: '',
    })

    // Lookup deve resolver sourceClippingId
    expect(queries).toHaveLength(1)
    expect(queries[0].vars).toMatchObject({ id: 'l-99' })
    // Mutation deve usar o clippingId resolvido — não o listingId
    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('SubscribeToClipping')
    expect(mutations[0].vars).toMatchObject({
      input: {
        clippingId: 'c-source-99',
        deliveryChannels: CHANNELS,
        extraEmails: [],
        webhookUrl: '',
      },
    })
    expect(result.subscriptionId).toBe('sub-1')
  })

  it('test_subscribeToClipping_with_webhook_channel_via_graphql: webhookUrl propagado', async () => {
    const { client, mutations } = makeClientStub({
      onQuery: () => ({
        marketplaceListing: makeListingNode({ sourceClippingId: 'c-web' }),
      }),
      onMutation: () => ({
        subscribeToClipping: {
          id: 'sub-web',
          role: 'SUBSCRIBER',
          deliveryChannels: {
            email: false,
            telegram: false,
            push: false,
            webhook: true,
          },
          extraEmails: [],
          webhookUrl: 'https://hooks.example.test/webhook',
          subscribedAt: '2026-05-26T12:00:00Z',
          active: true,
        },
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    await service.subscribe({
      listingId: 'l-w',
      deliveryChannels: {
        email: false,
        telegram: false,
        push: false,
        webhook: true,
      },
      extraEmails: [],
      webhookUrl: 'https://hooks.example.test/webhook',
    })

    expect(mutations[0].vars).toMatchObject({
      input: {
        clippingId: 'c-web',
        deliveryChannels: { webhook: true },
        webhookUrl: 'https://hooks.example.test/webhook',
      },
    })
  })

  it('test_unsubscribeFromClipping_via_graphql: dispara UnsubscribeFromClipping(clippingId)', async () => {
    const { client, queries, mutations } = makeClientStub({
      onQuery: () => ({
        marketplaceListing: makeListingNode({
          id: 'l-7',
          sourceClippingId: 'c-source-7',
        }),
      }),
      onMutation: () => ({ unsubscribeFromClipping: true }),
    })

    const service = createGraphQLMarketplaceService(client)
    await service.unsubscribe('l-7')

    // Lookup obrigatório para traduzir listing → clipping
    expect(queries[0].vars).toMatchObject({ id: 'l-7' })
    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('UnsubscribeFromClipping')
    expect(mutations[0].vars).toMatchObject({ clippingId: 'c-source-7' })
  })

  it('subscribe reusa cache de getListing — sem lookup duplicado', async () => {
    let lookups = 0
    const { client, mutations } = makeClientStub({
      onQuery: () => {
        lookups += 1
        return {
          marketplaceListing: makeListingNode({
            id: 'l-cache',
            sourceClippingId: 'c-cache',
          }),
        }
      },
      onMutation: () => ({
        subscribeToClipping: {
          id: 'sub-cache',
          role: 'SUBSCRIBER',
          deliveryChannels: CHANNELS,
          extraEmails: [],
          webhookUrl: '',
          subscribedAt: '2026-05-26T12:00:00Z',
          active: true,
        },
      }),
    })

    const service = createGraphQLMarketplaceService(client)
    await service.getListing('l-cache')
    await service.subscribe({
      listingId: 'l-cache',
      deliveryChannels: CHANNELS,
      extraEmails: [],
      webhookUrl: '',
    })
    await service.unsubscribe('l-cache')

    // Apenas 1 lookup pelo getListing — subscribe/unsubscribe usam o cache
    expect(lookups).toBe(1)
    expect(mutations).toHaveLength(2)
  })

  it('test_likeMarketplaceListing_via_graphql: dispara LikeMarketplaceListing', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ likeMarketplaceListing: true }),
    })

    const service = createGraphQLMarketplaceService(client)
    const result = await service.toggleLike('l-3')

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('LikeMarketplaceListing')
    expect(mutations[0].vars).toMatchObject({ listingId: 'l-3' })
    expect(result.liked).toBe(true)
  })

  it('test_cloneFromListing_via_graphql: dispara CloneMarketplaceListing', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ cloneMarketplaceListing: true }),
    })

    const service = createGraphQLMarketplaceService(client)
    await service.clone('l-5')

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('CloneFromListing')
    expect(mutations[0].vars).toMatchObject({ listingId: 'l-5' })
  })

  it('propaga erro do urql como Error legível', async () => {
    const { client } = makeClientStub({
      queryError: { graphQLErrors: [{ message: 'sem acesso' }] },
    })
    const service = createGraphQLMarketplaceService(client)
    await expect(service.listListings()).rejects.toThrow('sem acesso')
  })
})
