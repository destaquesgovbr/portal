/**
 * Implementação GraphQL do serviço de widgets.
 *
 * Atenção: o resolver `widgetConfig` do `graphql-api` retorna apenas
 * **listas de strings** (chaves) em `agencies`/`themes`. Para manter
 * compatibilidade com a UI (que espera `{key, name, type/hierarchyPath}`),
 * o facade hidrata os objetos com `name === key`. Quando o resolver for
 * estendido (Fase A futura), basta consumir os campos extras aqui.
 */

import type { Client } from '@urql/core'
import {
  WIDGET_ARTICLES_QUERY,
  WIDGET_CONFIG_QUERY,
} from '@/lib/graphql/queries/widgets'
import type {
  WidgetArticlesData,
  WidgetArticlesFilter,
  WidgetConfigData,
} from './types'

interface WidgetConfigQueryResult {
  widgetConfig: {
    agencies: string[]
    themes: string[]
  }
}

interface WidgetArticlesQueryResult {
  widgetArticles: {
    articles: unknown[]
    pagination: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }
}

export async function getWidgetConfigViaGraphQL(
  client: Client,
): Promise<WidgetConfigData> {
  const result = await client
    .query<WidgetConfigQueryResult>(WIDGET_CONFIG_QUERY, {})
    .toPromise()

  if (result.error) {
    throw result.error
  }

  const raw = result.data?.widgetConfig
  return {
    agencies: (raw?.agencies ?? []).map((key) => ({
      key,
      name: key,
      type: 'agency',
    })),
    themes: (raw?.themes ?? []).map((key) => ({
      key,
      name: key,
    })),
  }
}

export async function getWidgetArticlesViaGraphQL(
  filter: WidgetArticlesFilter,
  client: Client,
): Promise<WidgetArticlesData> {
  const page = filter.page ?? 1
  const config = {
    agencies: filter.agencies ?? [],
    themes: filter.themes ?? [],
    layout: 'LIST',
    articlesPerPage: filter.limit ?? 10,
  }

  const result = await client
    .query<WidgetArticlesQueryResult>(WIDGET_ARTICLES_QUERY, {
      config,
      page,
    })
    .toPromise()

  if (result.error) {
    throw result.error
  }

  const raw = result.data?.widgetArticles
  return {
    articles: raw?.articles ?? [],
    pagination: raw?.pagination ?? {
      page,
      limit: filter.limit ?? 10,
      total: 0,
      hasMore: false,
    },
  }
}
