/**
 * Testes do helper compartilhado `getHasTelegram` (Fase 1B).
 *
 * Substitui as ~4 leituras Firestore duplicadas (`getHasTelegram`) espalhadas
 * pelas páginas. Server-importável: aceita um urql Client injetado.
 */

import type { Client } from '@urql/core'
import { describe, expect, it } from 'vitest'
import { getHasTelegram } from '../user'

interface Op {
  query: string
  vars: unknown
}

function makeClientStub(handlers: {
  onQuery?: (query: string, vars: unknown) => unknown
  queryError?: unknown
}): { client: Client; queries: Op[] } {
  const queries: Op[] = []
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
  } as unknown as Client
  return { client, queries }
}

describe('getHasTelegram', () => {
  it('dispara CurrentUserHasTelegram e retorna true', async () => {
    const { client, queries } = makeClientStub({
      onQuery: () => ({ currentUserHasTelegramLinked: true }),
    })
    const result = await getHasTelegram(client)
    expect(queries).toHaveLength(1)
    expect(queries[0].query).toContain('CurrentUserHasTelegram')
    expect(result).toBe(true)
  })

  it('retorna false quando o schema retorna false', async () => {
    const { client } = makeClientStub({
      onQuery: () => ({ currentUserHasTelegramLinked: false }),
    })
    expect(await getHasTelegram(client)).toBe(false)
  })

  it('degradação graciosa: erro do urql → false (drop-in do getHasTelegram antigo)', async () => {
    const { client } = makeClientStub({
      queryError: { graphQLErrors: [{ message: 'falhou' }] },
    })
    expect(await getHasTelegram(client)).toBe(false)
  })

  it('false quando data ausente/undefined', async () => {
    const { client } = makeClientStub({ onQuery: () => ({}) })
    expect(await getHasTelegram(client)).toBe(false)
  })
})
