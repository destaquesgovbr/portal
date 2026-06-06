/**
 * Factory de clippings para testes E2E.
 *
 * Cria e remove clippings via `graphql-api` direto (não pelo UI), de modo que
 * cada spec controle seu próprio estado e limpe ao final. Todo clipping criado
 * leva o prefixo `E2E_TEST_` no nome para permitir limpeza em massa caso um
 * teste crashe antes do teardown.
 *
 * IMPORTANTE: estas operações usam o schema REAL do `graphql-api`, que
 * difere das operations do portal (`src/lib/graphql/queries/clippings.ts`) —
 * é justamente esse drift que os specs detectam. Aqui falamos o schema que o
 * servidor de fato expõe: `clippings` (não `myClippings`), `RecorteInput` sem
 * `id`, `ClippingInput` sem `active`, etc.
 */

import type { E2EGraphQLClient } from './graphql-client'

/** Prefixo obrigatório dos dados de teste (alvo de limpeza em massa). */
export const E2E_PREFIX = 'E2E_TEST_'

const CREATE_CLIPPING = /* GraphQL */ `
  mutation CreateClipping($input: ClippingInput!) {
    createClipping(input: $input) {
      id
      name
      recortes { title themes agencies keywords }
      schedule
      active
    }
  }
`

const DELETE_CLIPPING = /* GraphQL */ `
  mutation DeleteClipping($id: String!) {
    deleteClipping(id: $id)
  }
`

const MY_CLIPPINGS = /* GraphQL */ `
  query Clippings {
    clippings { id name isAuthor }
  }
`

export interface CreatedClipping {
  id: string
  name: string
  recortes: Array<{
    title: string
    themes: string[]
    agencies: string[]
    keywords: string[]
  }>
  schedule: string
  active: boolean
}

export interface MakeClippingOptions {
  /** Sufixo único para distinguir clippings dentro de um mesmo spec. */
  suffix?: string
  /** Override de recortes (default: 1 recorte com tema "Saúde"). */
  recortes?: Array<{
    title: string
    themes: string[]
    agencies: string[]
    keywords: string[]
  }>
  /** Cron de agendamento (default: 08:00 todo dia). */
  schedule?: string
}

/**
 * Cria um clipping de teste e retorna seus dados. O nome sempre começa com
 * `E2E_PREFIX`. Lança se a mutation falhar (sem fallback silencioso).
 */
export async function makeClipping(
  client: E2EGraphQLClient,
  opts: MakeClippingOptions = {},
): Promise<CreatedClipping> {
  const suffix = opts.suffix ?? 'clipping'
  const recortes = opts.recortes ?? [
    {
      title: 'Saúde',
      themes: ['Saúde'],
      agencies: [],
      keywords: [],
    },
  ]
  const input = {
    name: `${E2E_PREFIX}${suffix}`,
    description: 'Clipping criado por teste E2E — pode ser removido.',
    recortes,
    prompt: null,
    schedule: opts.schedule ?? '0 8 * * *',
    startDate: null,
    endDate: null,
    extraEmails: [],
    includeHistory: false,
  }
  const data = await client.execute<{ createClipping: CreatedClipping }>(
    CREATE_CLIPPING,
    { input },
  )
  return data.createClipping
}

/** Remove um clipping pelo ID. Idempotente o suficiente para teardown. */
export async function removeClipping(
  client: E2EGraphQLClient,
  id: string,
): Promise<void> {
  await client.execute<{ deleteClipping: boolean }>(DELETE_CLIPPING, { id })
}

/**
 * Remove todos os clippings de teste do bot (nome com `E2E_PREFIX`). Usado em
 * `afterAll` defensivo e em limpeza manual de lixo acumulado.
 */
export async function cleanupTestClippings(
  client: E2EGraphQLClient,
): Promise<number> {
  const data = await client.execute<{
    clippings: Array<{ id: string; name: string; isAuthor: boolean }>
  }>(MY_CLIPPINGS)
  const targets = data.clippings.filter(
    (c) => c.isAuthor && c.name.startsWith(E2E_PREFIX),
  )
  for (const c of targets) {
    await removeClipping(client, c.id)
  }
  return targets.length
}
