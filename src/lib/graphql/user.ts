/**
 * Helpers GraphQL relativos ao usuário autenticado.
 *
 * Server-importável (sem `'use client'`): pode ser chamado de Server
 * Components, Server Actions e Route Handlers passando um cliente SSR
 * (`createSSRClient(getToken)`), e também do browser usando o singleton
 * `getClient()`.
 */

import type { Client } from '@urql/core'
import {
  CURRENT_USER_HAS_TELEGRAM_QUERY,
  type CurrentUserHasTelegramQueryData,
} from '@/lib/graphql/queries/marketplace'
import { getClient } from './client'

/**
 * True se o usuário autenticado tem o Telegram vinculado.
 *
 * Substitui as ~4 leituras Firestore duplicadas (`getHasTelegram`) das páginas.
 * Drop-in: degrada graciosamente para `false` em qualquer erro (não logado,
 * sem doc, falha de rede) — mesma semântica do helper antigo.
 *
 * @param client Cliente urql. Default: `getClient()` (singleton browser). Em
 *   contexto server-side, passe `createSSRClient(getToken)`.
 */
export async function getHasTelegram(
  client: Client = getClient(),
): Promise<boolean> {
  try {
    const result = await client
      .query<CurrentUserHasTelegramQueryData>(
        CURRENT_USER_HAS_TELEGRAM_QUERY,
        {},
      )
      .toPromise()
    if (result.error) return false
    return result.data?.currentUserHasTelegramLinked ?? false
  } catch {
    return false
  }
}
