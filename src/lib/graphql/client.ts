/**
 * Cliente GraphQL urql.
 *
 * Exporta:
 *   - `createGraphQLClient(opts)`: factory pura (usada em testes e SSR).
 *   - `getClient()`: singleton para uso client-side (browser).
 *   - `createSSRClient()`: cliente fresco por request (Server Components / RSC).
 *
 * Subscriptions usam `graphql-sse` (Server-Sent Events), compatível com o
 * transport que o `graphql-api` (Strawberry) expõe via `GraphQLRouter`.
 */

import {
  Client,
  cacheExchange as defaultCacheExchange,
  type Exchange,
  fetchExchange,
  subscriptionExchange,
} from '@urql/core'
import { createClient as createSSEClient } from 'graphql-sse'
import { createAuthExchange } from './auth-exchange'

export interface CreateGraphQLClientOptions {
  /** URL absoluta para o endpoint GraphQL (ex.: `https://graphql.example.com/graphql`). */
  url: string
  /**
   * Função que retorna o JWT da sessão atual (ou `null`).
   * Se omitida, nenhum header `Authorization` é enviado.
   */
  getToken?: () => Promise<string | null>
  /**
   * Exchanges customizados a anexar **antes** do fetchExchange.
   * Útil para testes (substituir cacheExchange por um mock) e para o
   * cliente SSR (sem cache compartilhado).
   */
  extraExchanges?: Exchange[]
  /**
   * Se `true`, omite o cacheExchange padrão (caso o caller injete um via
   * `extraExchanges`). Default: `false`.
   */
  skipDefaultCache?: boolean
  /**
   * Se `true`, omite o subscriptionExchange (útil em testes que não exercitam
   * subscriptions). Default: `false`.
   */
  skipSubscriptions?: boolean
}

/**
 * Cria um Client urql configurado com auth + cache + subscriptions SSE.
 *
 * Não mantém estado global; chamadores que precisam de singleton usam
 * `getClient()`.
 */
export function createGraphQLClient(opts: CreateGraphQLClientOptions): Client {
  const exchanges: Exchange[] = []

  if (!opts.skipDefaultCache) {
    exchanges.push(defaultCacheExchange)
  }

  if (opts.extraExchanges?.length) {
    exchanges.push(...opts.extraExchanges)
  }

  if (opts.getToken) {
    exchanges.push(createAuthExchange({ getToken: opts.getToken }))
  }

  exchanges.push(fetchExchange)

  if (!opts.skipSubscriptions) {
    const sseClient = createSSEClient({
      // O graphql-api expõe SSE (graphql-sse spec) em `/graphql/stream`, não em
      // `/graphql` (que é POST de queries/mutations). Sem este ajuste, a
      // subscription `generateRecortes` falha com "Failed to fetch".
      url: toStreamUrl(opts.url),
      // Reusa o mesmo token da sessão para autenticar a stream (o agente exige
      // usuário autenticado no graphql-api).
      headers: opts.getToken
        ? async (): Promise<Record<string, string>> => {
            const token = await opts.getToken?.()
            return token ? { Authorization: `Bearer ${token}` } : {}
          }
        : undefined,
    })
    exchanges.push(
      subscriptionExchange({
        forwardSubscription(request) {
          const input = { ...request, query: request.query ?? '' }
          return {
            subscribe(sink) {
              const dispose = sseClient.subscribe(input, sink)
              return { unsubscribe: dispose }
            },
          }
        },
      }),
    )
  }

  return new Client({
    url: opts.url,
    exchanges,
  })
}

/**
 * Deriva a URL do endpoint SSE (`/graphql/stream`) a partir da URL do endpoint
 * GraphQL (`/graphql`). Se a URL não terminar em `/graphql`, faz append de
 * `/stream` mesmo assim (defensivo para configs não-canônicas).
 */
export function toStreamUrl(graphqlUrl: string): string {
  if (graphqlUrl.endsWith('/graphql')) {
    return `${graphqlUrl}/stream`
  }
  if (graphqlUrl.endsWith('/graphql/')) {
    return `${graphqlUrl}stream`
  }
  return `${graphqlUrl.replace(/\/$/, '')}/graphql/stream`
}

/**
 * Lê o access token da sessão NextAuth no browser via `/api/auth/session`.
 * Retorna `null` se não houver sessão/token (chamadas anônimas seguem sem
 * Authorization). Server-side usa um getToken próprio (ver `createSSRClient`).
 */
async function getBrowserSessionToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
    })
    if (!res.ok) {
      return null
    }
    const session = (await res.json()) as { accessToken?: string } | null
    return session?.accessToken ?? null
  } catch {
    return null
  }
}

/**
 * URL do endpoint GraphQL. Resolvida em runtime para permitir override em testes.
 */
function resolveGraphQLUrl(): string {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL
  if (!url) {
    // Fallback dev — não lança erro, apenas avisa em dev mode. Os componentes
    // de B2-B5 só chamarão o client quando a feature flag estiver ON.
    return 'http://localhost:8000/graphql'
  }
  return url
}

// ---------- Singleton client-side ----------

let _client: Client | null = null

/**
 * Retorna o singleton do Client (uso no browser).
 * Lazy-initialized para evitar chamadas durante module-init em SSR.
 *
 * Em B1, o `getToken` retorna `null` por default — wiring com NextAuth
 * acontece em B2 quando há queries reais para autenticar.
 */
export function getClient(): Client {
  if (!_client) {
    _client = createGraphQLClient({
      url: resolveGraphQLUrl(),
      getToken: getBrowserSessionToken,
    })
  }
  return _client
}

/**
 * Reset do singleton — uso exclusivo em testes.
 */
export function __resetClientForTesting(): void {
  _client = null
}

/**
 * Cria um Client fresco para uso server-side (RSC, Server Actions, Route Handlers).
 *
 * Não compartilha cache entre requests (cada request tem seu próprio cliente).
 * O `getToken` deve usar `auth()` do NextAuth v5 quando integrado em B2+.
 */
export function createSSRClient(
  getToken?: () => Promise<string | null>,
): Client {
  return createGraphQLClient({
    url: resolveGraphQLUrl(),
    getToken: getToken ?? (async () => null),
    // SSR não precisa de subscriptions (são client-only por natureza)
    skipSubscriptions: true,
  })
}
