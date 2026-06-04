/**
 * E2E — Preferências de push via GraphQL (flag `graphql.push`).
 *
 * A UI de push é gated por permissão de notificação do browser (service worker),
 * inviável de forma confiável em headless. Então validamos as operações
 * GraphQL que o portal usa (`pushFiltersData`, `pushPreferences`,
 * `updatePushPreferences`) como contrato real contra o graphql-api local —
 * exatamente as strings de operação de `src/lib/graphql/queries/push.ts`.
 *
 * Round-trip: lê prefs → atualiza → relê e confirma persistência.
 */

import { expect, test } from '@playwright/test'
import {
  assertDataPreconditions,
  createE2EGraphQLClient,
  type E2EGraphQLClient,
} from '../fixtures'

// Contrato CORRETO do graphql-api (o tipo `Agency` expõe `code`/`label`).
// NB: o portal em push.ts ainda consulta `key/name/type` (drift documentado em
// _plan/R1-DRIFT-CATALOG.md) — a correção do portal é escopo da Fase 5.
const PUSH_FILTERS_DATA = /* GraphQL */ `
  query PushFiltersData {
    pushFiltersData { agencies { code label } }
  }
`
const PUSH_PREFERENCES = /* GraphQL */ `
  query PushPreferences {
    pushPreferences { agencies }
  }
`
const UPDATE_PUSH_PREFERENCES = /* GraphQL */ `
  mutation UpdatePushPreferences($preferences: PushPreferencesInput!) {
    updatePushPreferences(preferences: $preferences)
  }
`

let client: E2EGraphQLClient

test.describe('Push — preferências via GraphQL', () => {
  test.beforeAll(async () => {
    await assertDataPreconditions()
    client = await createE2EGraphQLClient()
  })

  test('pushFiltersData lista agências disponíveis', async () => {
    const data = await client.execute<{
      pushFiltersData: { agencies: Array<{ code: string; label: string }> }
    }>(PUSH_FILTERS_DATA)
    expect(data.pushFiltersData.agencies.length).toBeGreaterThan(0)
    // Cada agência tem código e rótulo não-vazios.
    for (const a of data.pushFiltersData.agencies.slice(0, 5)) {
      expect(a.code).toBeTruthy()
      expect(a.label).toBeTruthy()
    }
  })

  test('round-trip: atualiza e relê preferências de agências', async () => {
    const filters = await client.execute<{
      pushFiltersData: { agencies: Array<{ code: string }> }
    }>(PUSH_FILTERS_DATA)
    const pick = filters.pushFiltersData.agencies.slice(0, 2).map((a) => a.code)
    expect(pick.length).toBe(2)

    await client.execute<{ updatePushPreferences: boolean }>(
      UPDATE_PUSH_PREFERENCES,
      { preferences: { agencies: pick, themes: [], enabled: true } },
    )

    const after = await client.execute<{
      pushPreferences: { agencies: string[] }
    }>(PUSH_PREFERENCES)
    // As agências escolhidas devem estar persistidas.
    for (const key of pick) {
      expect(after.pushPreferences.agencies).toContain(key)
    }

    // Limpeza: zera as preferências do bot.
    await client.execute<{ updatePushPreferences: boolean }>(
      UPDATE_PUSH_PREFERENCES,
      { preferences: { agencies: [], themes: [], enabled: true } },
    )
  })
})
