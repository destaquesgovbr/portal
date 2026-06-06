/**
 * Testes do facade de push (GraphQL-only).
 *
 * Verifica que cada operação delega para a implementação GraphQL,
 * cobrindo as 4 operações: pushPreferences, syncPushSubscription,
 * pushFiltersData (queries) e updatePushPreferences (mutation).
 * As funções recebem um `client` opcional (default = singleton).
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import {
  getPushFiltersData,
  getPushPreferences,
  syncPushSubscription,
  updatePushPreferences,
} from '../index'

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

describe('push facade — GraphQL-only', () => {
  it('test_pushPreferences_via_graphql: usa GraphQL e retorna agências', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ pushPreferences: { agencies: ['mfin', 'mec'] } }),
    })

    const result = await getPushPreferences(client)

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
      client,
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

  it('test_pushFiltersData_via_graphql: mapeia Agency{code,label} → {key,name,type}', async () => {
    // O schema expõe `Agency { code, label }`; o service mapeia para o shape
    // `{key,name,type}` consumido pela UI (contrato REST legado).
    const schemaAgencies = [
      { code: 'mfin', label: 'Ministério da Fazenda' },
      { code: 'mec', label: 'Ministério da Educação' },
    ]
    const { client, queries } = makeClientStub({
      onQuery: () => ({ pushFiltersData: { agencies: schemaAgencies } }),
    })

    const result = await getPushFiltersData(client)

    expect(result.agencies).toEqual([
      { key: 'mfin', name: 'Ministério da Fazenda', type: 'agency' },
      { key: 'mec', name: 'Ministério da Educação', type: 'agency' },
    ])
    expect(queries[0].query).toContain('PushFiltersData')
  })

  it('test_updatePushPreferences_via_graphql: envia mutation com lista de agências', async () => {
    const { client, mutations } = makeClientStub({
      onMutation: () => ({ updatePushPreferences: true }),
    })

    await updatePushPreferences({ agencies: ['mfin'] }, client)

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

    await expect(getPushPreferences(client)).rejects.toThrow('GraphQL error')
  })
})
