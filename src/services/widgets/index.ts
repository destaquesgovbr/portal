/**
 * Facade do serviço de widgets.
 *
 * Roteia entre GraphQL (flag `graphql.widgets` ON) e REST (default OFF).
 * Default = REST (fail-safe). Cache de 5min (ISR) do REST permanece
 * intacto — facade não invalida nem altera headers da rota Next.js.
 */

import type { Client } from '@urql/core'
import { getClient } from '@/lib/graphql/client'
import * as graphql from './graphql'
import * as rest from './rest'
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

export interface WidgetsFacadeOptions {
  useGraphQL: boolean
  client?: Client
  fetchImpl?: typeof fetch
}

function resolveClient(client?: Client): Client {
  return client ?? getClient()
}

export async function getWidgetConfig(
  opts: WidgetsFacadeOptions,
): Promise<WidgetConfigData> {
  if (opts.useGraphQL) {
    return graphql.getWidgetConfigViaGraphQL(resolveClient(opts.client))
  }
  return rest.getWidgetConfigViaRest(opts.fetchImpl)
}

export async function getWidgetArticles(
  filter: WidgetArticlesFilter,
  opts: WidgetsFacadeOptions,
): Promise<WidgetArticlesData> {
  if (opts.useGraphQL) {
    return graphql.getWidgetArticlesViaGraphQL(
      filter,
      resolveClient(opts.client),
    )
  }
  return rest.getWidgetArticlesViaRest(filter, opts.fetchImpl)
}
