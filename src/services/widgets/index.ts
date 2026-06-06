/**
 * Facade do serviço de widgets.
 *
 * GraphQL é o ÚNICO caminho (REST removido na R1). As queries de widgets
 * são públicas — o `graphql-api` tem CORS aberto (allow_origins *,
 * GET/POST/OPTIONS), então chamadas do browser (configurador) e
 * server→server (Server Action do embed) funcionam sem autenticação.
 *
 * NÃO usar `'use client'` aqui: a Server Action do embed importa este
 * módulo no servidor.
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import * as graphql from './graphql'
import type {
  WidgetArticlesData,
  WidgetArticlesFilter,
  WidgetConfigData,
} from './types'

export type {
  WidgetAgencyOption,
  WidgetArticlesData,
  WidgetArticlesFilter,
  WidgetConfigData,
  WidgetPagination,
  WidgetThemeOption,
} from './types'

function resolveClient(client?: Client): Client {
  return client ?? getClient()
}

export async function getWidgetConfig(
  client?: Client,
): Promise<WidgetConfigData> {
  return graphql.getWidgetConfigViaGraphQL(resolveClient(client))
}

export async function getWidgetArticles(
  filter: WidgetArticlesFilter,
  client?: Client,
): Promise<WidgetArticlesData> {
  return graphql.getWidgetArticlesViaGraphQL(filter, resolveClient(client))
}
