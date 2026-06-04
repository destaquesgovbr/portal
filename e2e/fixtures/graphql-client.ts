/**
 * Cliente GraphQL autenticado para setup/teardown de dados em testes E2E.
 *
 * Fala DIRETO com o `graphql-api` local (`http://localhost:8000/graphql` por
 * default, override via `E2E_GRAPHQL_URL`), com `Authorization: Bearer` do bot
 * E2E. Isso é deliberadamente independente do client urql do portal — as
 * fixtures precisam criar/limpar dados de forma confiável mesmo quando o portal
 * tem bugs (que é justamente o que os specs detectam).
 *
 * Erros (HTTP ou `errors[]` do GraphQL) viram exceções verbosas. NUNCA
 * silenciamos — uma fixture que falha deve quebrar o teste com mensagem clara.
 */

import { fetchBotAccessToken } from './keycloak'

const DEFAULT_GRAPHQL_URL = 'http://localhost:8000/graphql'

export function graphqlApiUrl(): string {
  return process.env.E2E_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL
}

export interface E2EGraphQLClient {
  /** Executa uma operação GraphQL (query ou mutation) e retorna `data`. */
  execute<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T>
  /** Token Bearer em uso (útil para chamadas ad-hoc, ex.: SSE). */
  readonly token: string
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; path?: string[] }>
}

/**
 * Cria um cliente autenticado. Obtém o token uma vez (reusado entre chamadas).
 */
export async function createE2EGraphQLClient(): Promise<E2EGraphQLClient> {
  const token = await fetchBotAccessToken()
  const url = graphqlApiUrl()

  async function execute<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      })
    } catch (err) {
      throw new Error(
        `Falha de rede ao chamar ${url}: ${(err as Error).message}. ` +
          `O graphql-api local está rodando em :8000? (make dev)`,
      )
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `graphql-api retornou HTTP ${res.status} em ${url}: ${text.slice(0, 500)}`,
      )
    }
    const json = (await res.json()) as GraphQLResponse<T>
    if (json.errors?.length) {
      const messages = json.errors.map((e) => e.message).join('; ')
      throw new Error(`GraphQL errors: ${messages}`)
    }
    if (json.data === undefined || json.data === null) {
      throw new Error('GraphQL retornou data vazio (sem errors)')
    }
    return json.data
  }

  return { execute, token }
}
