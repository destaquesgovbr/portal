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

  test('graphql-api responde CORS preflight para a origin permitida', async () => {
    // CORS é enforced pelo BROWSER, não por fetch no Node — validamos o que é
    // verificável server-side: o preflight OPTIONS da origin permitida
    // (CORS_ALLOW_ORIGINS, localmente http://localhost:3000) retorna
    // `access-control-allow-origin`. Confirma que o CORSMiddleware está ativo.
    // NB: embed em origin EXTERNA (widget de terceiros) exige CORS aberto em
    // prod (CORS_ALLOW_ORIGINS=* ou lista de origens) — config de deploy, não
    // validável neste setup local restrito.
    const allowedOrigin =
      process.env.E2E_PORTAL_ORIGIN ?? 'http://localhost:3000'
    const res = await fetch(graphqlApiUrl(), {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    const allowOrigin = res.headers.get('access-control-allow-origin')
    expect(
      allowOrigin,
      'graphql-api deve retornar access-control-allow-origin para a origin permitida',
    ).toBeTruthy()
  })
})
