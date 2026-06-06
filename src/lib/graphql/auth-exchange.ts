/**
 * Auth exchange para o cliente urql.
 *
 * Injeta `Authorization: Bearer <token>` nas requisições GraphQL quando há
 * uma sessão NextAuth válida. Usa `@urql/exchange-auth`, que:
 *   - chama `getAuth()` para obter o estado de auth inicial e quando uma op
 *     dispara `didAuthError` (refresh);
 *   - chama `addAuthToOperation()` para injetar o header em cada operação;
 *   - chama `willAuthError()` para reauth pró-ativo (opcional);
 *   - chama `didAuthError()` para detectar resposta 401/auth-error.
 *
 * O token-getter é injetado para permitir uso client-side (via NextAuth React
 * `useSession()` indireto) e server-side (`auth()` do NextAuth v5) sem que o
 * exchange precise conhecer o transporte.
 */

import type { Exchange } from '@urql/core'
import { authExchange } from '@urql/exchange-auth'

export interface AuthState {
  token: string | null
}

export interface CreateAuthExchangeOptions {
  /**
   * Função async que retorna o JWT atual da sessão (ou `null` se não houver).
   * Em client-side, costuma chamar `/api/auth/session` ou usar o `accessToken`
   * exposto pela sessão. Em server-side, usa `auth()` do NextAuth v5.
   */
  getToken: () => Promise<string | null>
}

/**
 * Cria um auth exchange parametrizado por um token-getter.
 *
 * @example
 *   const exchange = createAuthExchange({
 *     getToken: async () => session?.accessToken ?? null,
 *   })
 */
export function createAuthExchange(opts: CreateAuthExchangeOptions): Exchange {
  return authExchange(async (utils) => {
    let token = await opts.getToken()

    return {
      addAuthToOperation(operation) {
        if (!token) {
          return operation
        }
        return utils.appendHeaders(operation, {
          Authorization: `Bearer ${token}`,
        })
      },
      didAuthError(error) {
        return error.response?.status === 401
      },
      async refreshAuth() {
        // Re-pega o token. A renovação efetiva (refresh JWT) é responsabilidade
        // do NextAuth — aqui só re-lemos o estado atual após a renovação.
        token = await opts.getToken()
      },
    }
  })
}
