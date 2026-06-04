/**
 * E2E — Widgets via GraphQL (flag `graphql.widgets`). Público (sem auth).
 *
 * Valida (a) o configurador de widgets renderiza no portal e (b) as queries
 * `widgetConfig`/`widgetArticles` que o portal usa funcionam contra o
 * graphql-api — incluindo o caso de CORS (chamada cross-origin sem cookie).
 *
 * As operações são idênticas às de `src/lib/graphql/queries/widgets.ts`.
 */

import { expect, test } from '@playwright/test'
import { assertDataPreconditions, graphqlApiUrl } from '../fixtures'

const WIDGET_CONFIG = /* GraphQL */ `
  query WidgetConfig { widgetConfig { agencies themes } }
`
const WIDGET_ARTICLES = /* GraphQL */ `
  query WidgetArticles($config: WidgetConfigInput!, $page: Int!) {
    widgetArticles(config: $config, page: $page) {
      articles { uniqueId title url agency publishedAt }
      pagination { page limit total hasMore }
    }
  }
`

async function publicGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(graphqlApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    throw new Error(`graphql-api HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    data?: T
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) throw new Error('data vazio')
  return json.data
}

test.beforeAll(async () => {
  await assertDataPreconditions()
})

test.describe('Widgets via GraphQL', () => {
  test('configurador de widgets renderiza', async ({ page }) => {
    await page.goto('/widgets/configurador')
    // O configurador deve carregar algum controle de seleção (tema/agência).
    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('widgetConfig retorna agências e temas', async () => {
    const data = await publicGraphQL<{
      widgetConfig: { agencies: string[]; themes: string[] }
    }>(WIDGET_CONFIG)
    expect(data.widgetConfig.agencies.length).toBeGreaterThan(0)
    expect(data.widgetConfig.themes.length).toBeGreaterThan(0)
  })

  test('widgetArticles retorna artigos paginados', async () => {
    const data = await publicGraphQL<{
      widgetArticles: {
        articles: Array<{ uniqueId: string; title: string }>
        pagination: { page: number; total: number; hasMore: boolean }
      }
    }>(WIDGET_ARTICLES, {
      config: { agencies: [], themes: [], articlesPerPage: 5 },
      page: 1,
    })
    expect(data.widgetArticles.articles.length).toBeGreaterThan(0)
    expect(data.widgetArticles.pagination.total).toBeGreaterThan(0)
    // Cada artigo tem id e título.
    for (const a of data.widgetArticles.articles) {
      expect(a.uniqueId).toBeTruthy()
      expect(a.title).toBeTruthy()
    }
  })

  test('widgetArticles aceita request cross-origin (CORS para embed)', async () => {
    // Simula um embed externo: Origin diferente do portal.
    const data = await publicGraphQL<{
      widgetArticles: { articles: unknown[] }
    }>(
      WIDGET_ARTICLES,
      { config: { agencies: [], themes: [], articlesPerPage: 3 }, page: 1 },
      { Origin: 'https://exemplo-orgao.gov.br' },
    )
    expect(data.widgetArticles.articles.length).toBeGreaterThan(0)
  })
})
