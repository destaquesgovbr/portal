/**
 * Testes da implementação GraphQL do `ClippingService` (Fase B2).
 *
 * Cobre as operações principais: listagem, criação (com validação cron),
 * atualização de conteúdo, atualização de canais (subscription separada),
 * exclusão, envio imediato e estimativa.
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import type { ClippingPayload } from '@/types/clipping'
import { createGraphQLClippingService } from '../graphql'

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

function makeClippingNode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Meu Clipping',
    description: 'Resumo',
    recortes: [
      {
        id: 'r1',
        title: 'Recorte 1',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: '',
    schedule: '0 8 * * *',
    scheduleTime: null,
    nextRunAt: '2026-06-01T11:00:00Z',
    startDate: null,
    endDate: null,
    extraEmails: [],
    includeHistory: false,
    authorUserId: 'user-1',
    active: true,
    createdAt: '2026-05-26T00:00:00Z',
    updatedAt: '2026-05-26T00:00:00Z',
    isAuthor: true,
    publishedToMarketplace: false,
    marketplaceListingId: null,
    mySubscription: {
      id: 'sub-1',
      role: 'AUTHOR',
      deliveryChannels: {
        email: true,
        telegram: false,
        push: false,
        webhook: false,
      },
      extraEmails: ['extra@example.com'],
      webhookUrl: '',
      subscribedAt: '2026-05-26T00:00:00Z',
      active: true,
    },
    ...overrides,
  }
}

function makePayload(
  overrides: Partial<ClippingPayload> = {},
): ClippingPayload {
  return {
    name: 'Meu Clipping',
    description: '',
    recortes: [
      {
        id: 'r1',
        title: 'Recorte 1',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: '',
    schedule: '0 8 * * *',
    deliveryChannels: {
      email: true,
      telegram: false,
      push: false,
      webhook: false,
    },
    active: true,
    extraEmails: [],
    webhookUrl: '',
    includeHistory: false,
    ...overrides,
  }
}

// ---------- Tests ----------

describe('graphqlClippingService — listClippings', () => {
  it('test_clippingList_uses_graphql_when_flag_on: query MyClippings e mapeia para Clipping', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        myClippings: [makeClippingNode(), makeClippingNode({ id: 'c2' })],
      }),
    })

    const service = createGraphQLClippingService(client)
    const result = await service.listClippings()

    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('MyClippings')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('c1')
    expect(result[0].deliveryChannels).toEqual({
      email: true,
      telegram: false,
      push: false,
      webhook: false,
    })
    expect(result[0].extraEmails).toEqual(['extra@example.com'])
  })

  it('propaga erro do server', async () => {
    const { client } = makeClientStub({
      queryError: { message: 'Boom' },
    })
    const service = createGraphQLClippingService(client)
    await expect(service.listClippings()).rejects.toThrow('Boom')
  })
})

describe('graphqlClippingService — createClipping', () => {
  it('test_createClipping_via_graphql_passes_schedule_field: envia schedule no input', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: (body) => {
        if (body.includes('CreateClipping')) {
          return { createClipping: makeClippingNode() }
        }
        return { updateMySubscription: {} }
      },
    })

    const service = createGraphQLClippingService(client)
    await service.createClipping(makePayload({ schedule: '0 9 * * 1-5' }))

    const createMut = mutations.find((m) => m.query.includes('CreateClipping'))
    expect(createMut).toBeDefined()
    const vars = createMut?.vars as {
      input: { schedule: string; name: string }
    }
    expect(vars.input.schedule).toBe('0 9 * * 1-5')
    expect(vars.input.name).toBe('Meu Clipping')
  })

  it('test_createClipping_via_graphql_validates_cron_client_side: rejeita cron inválido antes da mutation', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ createClipping: makeClippingNode() }),
    })
    const service = createGraphQLClippingService(client)

    await expect(
      service.createClipping(makePayload({ schedule: 'garbage' })),
    ).rejects.toThrow(/cron/i)

    expect(mutations).toHaveLength(0)
  })

  it('aciona updateMySubscription após criar quando há canais ligados', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: (body) => {
        if (body.includes('CreateClipping')) {
          return { createClipping: makeClippingNode() }
        }
        return { updateMySubscription: { id: 'sub-1' } }
      },
    })

    const service = createGraphQLClippingService(client)
    await service.createClipping(makePayload())

    const updateSub = mutations.find((m) =>
      m.query.includes('UpdateMySubscription'),
    )
    expect(updateSub).toBeDefined()
  })
})

describe('graphqlClippingService — updateClipping', () => {
  it('test_updateClipping_content_via_graphql: dispara mutation UpdateClipping com id+input', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: (body) => {
        if (body.includes('UpdateClipping')) {
          return { updateClipping: makeClippingNode({ id: 'c-99' }) }
        }
        return { updateMySubscription: {} }
      },
    })

    const service = createGraphQLClippingService(client)
    await service.updateClipping('c-99', makePayload({ name: 'Atualizado' }))

    const updateMut = mutations.find((m) => m.query.includes('UpdateClipping'))
    expect(updateMut).toBeDefined()
    const vars = updateMut?.vars as { id: string; input: { name: string } }
    expect(vars.id).toBe('c-99')
    expect(vars.input.name).toBe('Atualizado')
  })
})

describe('graphqlClippingService — updateMySubscription', () => {
  it('test_updateMySubscription_delivery_via_graphql: mutation separada para channels', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({
        updateMySubscription: {
          id: 'sub-1',
          role: 'AUTHOR',
          deliveryChannels: {
            email: true,
            telegram: true,
            push: false,
            webhook: false,
          },
          extraEmails: [],
          webhookUrl: '',
          active: true,
        },
      }),
    })

    const service = createGraphQLClippingService(client)
    await service.updateMySubscription('c1', {
      deliveryChannels: {
        email: true,
        telegram: true,
        push: false,
        webhook: false,
      },
      extraEmails: ['x@y.com'],
      webhookUrl: '',
    })

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('UpdateMySubscription')
    const vars = mutations[0].vars as {
      clippingId: string
      channels: { email: boolean }
      extraEmails: string[]
    }
    expect(vars.clippingId).toBe('c1')
    expect(vars.channels.email).toBe(true)
    expect(vars.extraEmails).toEqual(['x@y.com'])
  })
})

describe('graphqlClippingService — deleteClipping', () => {
  it('test_deleteClipping_via_graphql: dispara mutation DeleteClipping com id', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ deleteClipping: true }),
    })

    const service = createGraphQLClippingService(client)
    await service.deleteClipping('c-42')

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('DeleteClipping')
    expect((mutations[0].vars as { id: string }).id).toBe('c-42')
  })
})

describe('graphqlClippingService — estimate', () => {
  it('test_clipping_estimate_via_graphql: query ClippingEstimate retorna total/perRecorte', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        clippingEstimate: { total: 42, perRecorte: [12, 30] },
      }),
    })

    const service = createGraphQLClippingService(client)
    const result = await service.estimate([
      { id: 'r1', title: 't', themes: ['01'], agencies: [], keywords: [] },
      { id: 'r2', title: 't2', themes: [], agencies: ['mfin'], keywords: [] },
    ])

    expect(result).toEqual({ total: 42, perRecorte: [12, 30] })
    expect(queries[0].query).toContain('ClippingEstimate')
  })
})

describe('graphqlClippingService — sendNow', () => {
  it('test_send_clipping_now_via_graphql: mutation SendClippingNow com clippingId', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({
        sendClippingNow: { ok: true, dispatched: true },
      }),
    })

    const service = createGraphQLClippingService(client)
    await service.sendNow('c-7')

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('SendClippingNow')
    expect((mutations[0].vars as { clippingId: string }).clippingId).toBe('c-7')
  })

  it('propaga erro quando o servidor retorna error', async () => {
    const { client } = makeClientStub({
      mutationError: { message: 'Worker down' },
    })
    const service = createGraphQLClippingService(client)
    await expect(service.sendNow('c-7')).rejects.toThrow('Worker down')
  })
})

describe('graphqlClippingService — listReleases', () => {
  it('query Clipping(releases) retorna releases com paginação hasMore', async () => {
    const release = (id: string) => ({
      id,
      clippingId: 'c1',
      clippingName: 'Meu Clipping',
      digestHtml: `<p>${id}</p>`,
      releaseUrl: `/clipping/release/${id}`,
      refTime: '2026-05-26T08:00:00Z',
      sinceHours: 24,
      publishedAt: '2026-05-26T08:01:00Z',
    })
    const { client, queries } = makeClientStub({
      onQuery: () => ({
        clipping: {
          id: 'c1',
          releases: [release('rel-1'), release('rel-2'), release('rel-3')],
        },
      }),
    })

    const service = createGraphQLClippingService(client)
    const result = await service.listReleases('c1', { limit: 2 })

    expect(queries[0].query).toContain('ClippingReleases')
    expect(result.releases).toHaveLength(2)
    expect(result.hasMore).toBe(true)
    expect(result.releases[0].digestHtml).toBe('<p>rel-1</p>')
  })
})
