/**
 * Testes do facade do serviço de clipping.
 *
 * GraphQL é o único caminho: `getClippingService(client?)` sempre devolve a
 * implementação GraphQL. Os componentes do portal consomem o facade via hook
 * `useClippingService()` (testado nos testes dos componentes).
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import { getClippingService } from '../index'

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
        return { data: handlers.onQuery?.(body, vars) ?? {}, error: undefined }
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
          error: undefined,
        }
      },
    }),
  } as unknown as Client

  return { client, queries, mutations }
}

describe('getClippingService — caminho GraphQL', () => {
  it('test_clippingList_uses_graphql: dispara query GraphQL', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ clippings: [] }),
    })

    const service = getClippingService(client)
    await service.listClippings()

    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('clippings')
  })
})
