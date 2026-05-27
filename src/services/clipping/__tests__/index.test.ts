/**
 * Testes do facade do serviço de clipping (Fase B2).
 *
 * Verifica o roteamento entre GraphQL (flag ON) e REST (flag OFF) via
 * `getClippingService({ useGraphQL })`. Os componentes do portal consomem
 * o facade via hook `useClippingService()` (testado nos testes dos
 * componentes), mas a lógica de roteamento é a mesma.
 */

import type { Client } from '@urql/core'
import { describe, expect, it, vi } from 'vitest'
import { getClippingService } from '../index'

interface FetchCall {
  url: string
  init: RequestInit
}

function makeFetchMock(
  response: unknown,
  status = 200,
): { fn: typeof fetch; calls: FetchCall[] } {
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

describe('getClippingService — roteamento por flag', () => {
  it('test_clippingList_uses_graphql_when_flag_on: dispara query GraphQL', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ myClippings: [] }),
    })

    const service = getClippingService({ useGraphQL: true, client })
    await service.listClippings()

    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('MyClippings')
  })

  it('test_clippingList_uses_rest_when_flag_off: chama /api/clipping via fetch', async () => {
    const { fn, calls } = makeFetchMock([])

    const service = getClippingService({ useGraphQL: false, fetchImpl: fn })
    await service.listClippings()

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/clipping')
  })

  it('rota REST: createClipping faz POST em /api/clipping', async () => {
    const { fn, calls } = makeFetchMock({ id: 'new-id' })

    const service = getClippingService({ useGraphQL: false, fetchImpl: fn })
    await service.createClipping({
      name: 'X',
      description: '',
      recortes: [
        { id: 'r', title: 't', themes: ['01'], agencies: [], keywords: [] },
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
    })

    expect(calls[0].url).toBe('/api/clipping')
    expect(calls[0].init.method).toBe('POST')
  })

  it('rota REST: deleteClipping faz DELETE', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })

    const service = getClippingService({ useGraphQL: false, fetchImpl: fn })
    await service.deleteClipping('c-42')

    expect(calls[0].url).toBe('/api/clipping/c-42')
    expect(calls[0].init.method).toBe('DELETE')
  })

  it('rota REST: estimate inclui recortes na querystring', async () => {
    const { fn, calls } = makeFetchMock({ total: 5, perRecorte: [5] })

    const service = getClippingService({ useGraphQL: false, fetchImpl: fn })
    const result = await service.estimate([
      { id: 'r', title: 't', themes: ['01'], agencies: [], keywords: [] },
    ])

    expect(result).toEqual({ total: 5, perRecorte: [5] })
    expect(calls[0].url).toContain('/api/clipping/estimate?recortes=')
  })

  it('rota REST: sendNow chama /api/clipping/:id/send', async () => {
    const { fn, calls } = makeFetchMock({ ok: true })

    const service = getClippingService({ useGraphQL: false, fetchImpl: fn })
    await service.sendNow('c-7')

    expect(calls[0].url).toBe('/api/clipping/c-7/send')
    expect(calls[0].init.method).toBe('POST')
  })
})
