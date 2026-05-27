/**
 * Testes do facade de push (PLANO-ATUALIZACAO-v2, Fase B5).
 *
 * Verifica o roteamento entre GraphQL (flag ON) e REST (flag OFF),
 * cobrindo as 4 operações: pushPreferences, syncPushSubscription,
 * pushFiltersData (queries) e updatePushPreferences (mutation).
 */

import type { Client } from '@urql/core'
import { describe, expect, it, vi } from 'vitest'
import {
  getPushFiltersData,
  getPushPreferences,
  syncPushSubscription,
  updatePushPreferences,
} from '../index'

interface FetchCall {
  url: string
  init: RequestInit
}

function makeFetchMock(response: unknown, status = 200) {
  const calls: FetchCall[] = []
  const fn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push({ url, init: init ?? {} })
      return new Response(JSON.stringify(response), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  )
  return { fn: fn as unknown as typeof fetch, calls }
}

/** Cria um stub do urql Client que captura queries/mutations e retorna shaped data. */
function makeClientStub(handlers: {
  onQuery?: (query: string, vars: unknown) => unknown
  onMutation?: (query: string, vars: unknown) => unknown
}): {
  client: Client
  queries: Array<{ query: string; vars: unknown }>
  mutations: Array<{ query: string; vars: unknown }>
} {
  const queries: Array<{ query: string; vars: unknown }> = []
  const mutations: Array<{ query: string; vars: unknown }> = []

  const client = {
    query: (doc: { loc?: { source?: { body: string } } }, vars: unknown) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        queries.push({ query: body, vars })
        const data = handlers.onQuery?.(body, vars) ?? {}
        return { data, error: undefined }
      },
    }),
    mutation: (
      doc: { loc?: { source?: { body: string } } },
      vars: unknown,
    ) => ({
      toPromise: async () => {
        const body = doc?.loc?.source?.body ?? ''
        mutations.push({ query: body, vars })
        const data = handlers.onMutation?.(body, vars) ?? {}
        return { data, error: undefined }
      },
    }),
  } as unknown as Client

  return { client, queries, mutations }
}

describe('push facade — GraphQL routing (flag ON)', () => {
  it('test_pushPreferences_via_graphql_when_flag_on: usa GraphQL e retorna agências', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ pushPreferences: { agencies: ['mfin', 'mec'] } }),
    })

    const result = await getPushPreferences({ useGraphQL: true, client })

    expect(result.agencies).toEqual(['mfin', 'mec'])
    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('PushPreferences')
  })

  it('test_pushSubscriptionSync_via_graphql: chama mutation com endpoint/keys', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ syncPushSubscription: true }),
    })

    await syncPushSubscription(
      {
        endpoint: 'https://push.example/abc',
        keys: { p256dh: 'p256-key', auth: 'auth-key' },
      },
      { useGraphQL: true, client },
    )

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('SyncPushSubscription')
    expect(mutations[0].vars).toEqual({
      subscription: {
        endpoint: 'https://push.example/abc',
        keysP256dh: 'p256-key',
        keysAuth: 'auth-key',
      },
    })
  })

  it('test_pushFiltersData_via_graphql: retorna agências do schema GraphQL', async () => {
    const agencies = [
      { key: 'mfin', name: 'Ministério da Fazenda', type: 'agency' },
      { key: 'mec', name: 'Ministério da Educação', type: 'agency' },
    ]
    const { client, queries } = makeClientStub({
      onQuery: () => ({ pushFiltersData: { agencies } }),
    })

    const result = await getPushFiltersData({ useGraphQL: true, client })

    expect(result.agencies).toEqual(agencies)
    expect(queries[0].query).toContain('PushFiltersData')
  })

  it('test_updatePushPreferences_via_graphql: envia mutation com lista de agências', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ updatePushPreferences: true }),
    })

    await updatePushPreferences(
      { agencies: ['mfin'] },
      { useGraphQL: true, client },
    )

    expect(mutations).toHaveLength(1)
    expect(mutations[0].query).toContain('UpdatePushPreferences')
    const vars = mutations[0].vars as { preferences: { agencies: string[] } }
    expect(vars.preferences.agencies).toEqual(['mfin'])
  })

  it('test_pushPreferences_graphql_propagates_error: rethrow quando o servidor retorna error', async () => {
    const error = new Error('GraphQL error')
    const client = {
      query: () => ({
        toPromise: async () => ({ data: undefined, error }),
      }),
    } as unknown as Client

    await expect(
      getPushPreferences({ useGraphQL: true, client }),
    ).rejects.toThrow('GraphQL error')
  })
})

describe('push facade — REST fallback (flag OFF)', () => {
  it('test_facade_falls_back_to_rest_when_flag_off_push: getPushPreferences usa /api/push/preferences', async () => {
    const { fn, calls } = makeFetchMock({ agencies: ['mfin'] })

    const result = await getPushPreferences({
      useGraphQL: false,
      fetchImpl: fn,
    })

    expect(result.agencies).toEqual(['mfin'])
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/push/preferences')
  })

  it('test_updatePushPreferences_rest_uses_put_to_preferences_route', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })

    await updatePushPreferences(
      { agencies: ['mfin'] },
      { useGraphQL: false, fetchImpl: fn },
    )

    expect(calls[0].init.method).toBe('PUT')
    expect(calls[0].url).toBe('/api/push/preferences')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      agencies: ['mfin'],
    })
  })

  it('test_syncPushSubscription_rest_uses_post_to_sync_route', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })

    await syncPushSubscription(
      {
        endpoint: 'https://push.example/abc',
        keys: { p256dh: 'p256', auth: 'a' },
      },
      { useGraphQL: false, fetchImpl: fn },
    )

    expect(calls[0].url).toBe('/api/push/sync')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p256', auth: 'a' },
    })
  })

  it('test_getPushFiltersData_rest_uses_filters_data_route', async () => {
    const agencies = [{ key: 'mfin', name: 'Fazenda', type: 'agency' }]
    const { fn, calls } = makeFetchMock({ agencies })

    const result = await getPushFiltersData({
      useGraphQL: false,
      fetchImpl: fn,
    })

    expect(result.agencies).toEqual(agencies)
    expect(calls[0].url).toBe('/api/push/filters-data')
  })

  it('test_getPushPreferences_rest_handles_401_gracefully', async () => {
    const { fn } = makeFetchMock({ error: 'auth' }, 401)

    const result = await getPushPreferences({
      useGraphQL: false,
      fetchImpl: fn,
    })

    // 401 no REST atual retorna estado vazio (sem sessão = sem prefs)
    expect(result.agencies).toEqual([])
  })
})
