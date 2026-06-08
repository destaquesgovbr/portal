/**
 * E2E — Páginas de conteúdo PÚBLICO via GraphQL. Público (sem auth).
 *
 * Gate de regressão da migração Fase 2 (conteúdo público: notícias, busca,
 * detalhe de artigo, temas, órgãos) de Typesense direto → `graphql-api`.
 *
 * Estratégia: antes de assertar cada página, deriva DADOS REAIS chamando o
 * graphql-api direto (queries públicas, sem token) — nada de IDs/labels
 * hardcoded e nada de `test.skip` data-dependent. Se o índice de produção não
 * tiver os dados mínimos, FALHAMOS com mensagem acionável (a pré-condição é que
 * o ambiente tenha conteúdo).
 *
 * As operações espelham as que o portal usa em `src/services/content/graphql.ts`
 * e `src/lib/graphql/queries/articles.ts`.
 */

import { expect, type Page, test } from '@playwright/test'
import { assertDataPreconditions, graphqlApiUrl } from '../fixtures'

// ---------- Cliente GraphQL público (sem auth) ----------

async function publicGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = graphqlApiUrl()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    throw new Error(
      `Falha de rede ao chamar ${url}: ${(err as Error).message}. ` +
        'O graphql-api está no ar? (make dev / E2E_GRAPHQL_URL)',
    )
  }
  if (!res.ok) {
    throw new Error(`graphql-api HTTP ${res.status} em ${url}`)
  }
  const json = (await res.json()) as {
    data?: T
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`,
    )
  }
  if (json.data == null) throw new Error('GraphQL retornou data vazio')
  return json.data
}

// ---------- Queries de derivação (espelham o portal) ----------

const ARTICLES_QUERY = /* GraphQL */ `
  query DeriveArticles($page: Int!, $limit: Int!, $filter: ArticleFilter) {
    articles(page: $page, limit: $limit, filter: $filter) {
      articles { uniqueId title }
      found
    }
  }
`

const THEMES_QUERY = /* GraphQL */ `
  query DeriveThemes { themes { code label } }
`

const AGENCIES_QUERY = /* GraphQL */ `
  query DeriveAgencies { agencies { code label } }
`

const RELATED_ARTICLES_QUERY = /* GraphQL */ `
  query DeriveRelated($uniqueId: String!, $limit: Int!) {
    relatedArticles(uniqueId: $uniqueId, limit: $limit) { uniqueId }
  }
`

type ArticlesData = {
  articles: {
    articles: Array<{ uniqueId: string; title: string }>
    found: number
  }
}

// ---------- Helpers de derivação ----------

/** Primeiro artigo deduplicado do índice (uniqueId + title). FALHA se vazio. */
async function deriveFirstArticle(): Promise<{
  uniqueId: string
  title: string
}> {
  const data = await publicGraphQL<ArticlesData>(ARTICLES_QUERY, {
    page: 1,
    limit: 1,
    filter: { dedup: true },
  })
  if (data.articles.found <= 0 || data.articles.articles.length === 0) {
    throw new Error(
      'Pré-condição falhou: `articles(dedup:true)` não retornou artigos. ' +
        'O índice (Typesense) precisa estar populado para este gate.',
    )
  }
  const first = data.articles.articles[0]
  expect(first.uniqueId, 'artigo derivado deve ter uniqueId').toBeTruthy()
  expect(first.title, 'artigo derivado deve ter title').toBeTruthy()
  return first
}

/**
 * Extrai um termo de busca "estável" do título de um artigo real: a primeira
 * palavra com >= 4 chars apenas alfabéticos (evita stopwords/pontuação/números
 * que podem não casar no Typesense).
 */
function deriveSearchTerm(title: string): string {
  const word = title
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ''))
    .find((w) => w.length >= 4)
  if (!word) {
    throw new Error(
      `Não consegui derivar um termo de busca do título "${title}". ` +
        'Título sem palavra alfabética >= 4 chars — improvável; investigue o índice.',
    )
  }
  return word
}

/**
 * Acha o primeiro tema (label) que efetivamente retorna artigos pelo filtro
 * `themeLabel` — o mesmo filtro que a página `/temas/[label]` usa. Garante que
 * a página detalhe terá conteúdo a renderizar. FALHA se nenhum tema tiver dados.
 */
async function deriveThemeWithArticles(): Promise<string> {
  const { themes } = await publicGraphQL<{
    themes: Array<{ code: string; label: string }>
  }>(THEMES_QUERY)
  const labeled = themes.filter((t) => t.label?.trim())
  if (labeled.length === 0) {
    throw new Error(
      'Pré-condição falhou: `themes` não retornou nenhum tema com label. ' +
        'O Postgres (govbrnews) precisa estar populado.',
    )
  }
  for (const theme of labeled) {
    const data = await publicGraphQL<ArticlesData>(ARTICLES_QUERY, {
      page: 1,
      limit: 1,
      filter: { themeLabel: theme.label, dedup: true },
    })
    if (data.articles.found > 0) return theme.label
  }
  throw new Error(
    'Pré-condição falhou: nenhum tema retornado por `themes` tem artigos ' +
      `(testados ${labeled.length} temas via filtro themeLabel). Índice vazio?`,
  )
}

/**
 * Acha a primeira agência (code) que retorna artigos pelo filtro `agencies` —
 * o mesmo filtro que `/orgaos/[key]` usa. FALHA se nenhuma tiver dados.
 */
async function deriveAgencyWithArticles(): Promise<{
  code: string
  label: string
}> {
  const { agencies } = await publicGraphQL<{
    agencies: Array<{ code: string; label: string }>
  }>(AGENCIES_QUERY)
  if (agencies.length === 0) {
    throw new Error(
      'Pré-condição falhou: `agencies` não retornou nenhuma agência. ' +
        'O Postgres (govbrnews) precisa estar populado.',
    )
  }
  for (const agency of agencies) {
    if (!agency.code?.trim()) continue
    const data = await publicGraphQL<ArticlesData>(ARTICLES_QUERY, {
      page: 1,
      limit: 1,
      filter: { agencies: [agency.code], dedup: true },
    })
    if (data.articles.found > 0) return agency
  }
  throw new Error(
    'Pré-condição falhou: nenhuma agência de `agencies` tem artigos ' +
      `(testadas ${agencies.length}). Índice vazio?`,
  )
}

/** Locator de qualquer card de notícia: um link para `/artigos/<id>`. */
function articleLinks(page: Page) {
  return page.locator('a[href^="/artigos/"]')
}

// ---------- Suíte ----------

test.beforeAll(async () => {
  await assertDataPreconditions()
})

test.describe('Conteúdo público via GraphQL', () => {
  test('feed /noticias renderiza cards de notícia (links /artigos/)', async ({
    page,
  }) => {
    // `/noticias` é o feed migrado (getLatestArticles → graphql-api). A landing
    // `/` é institucional e não lista artigos; o feed real de cards é este.
    await page.goto('/noticias')
    const cards = articleLinks(page)
    await expect(cards.first()).toBeVisible({ timeout: 20_000 })
    expect(
      await cards.count(),
      'feed deve ter ao menos um card',
    ).toBeGreaterThan(0)
    // O href deve apontar para um detalhe de artigo concreto.
    const href = await cards.first().getAttribute('href')
    expect(href).toMatch(/^\/artigos\/.+/)
  })

  test('busca /busca?q=<termo> renderiza resultados (links /artigos/)', async ({
    page,
  }) => {
    const article = await deriveFirstArticle()
    const term = deriveSearchTerm(article.title)

    await page.goto(`/busca?q=${encodeURIComponent(term)}`)

    // Cabeçalho da página de busca confirma o termo (QueryPageClient).
    await expect(
      page.getByRole('heading', { name: `Resultados para "${term}"` }),
    ).toBeVisible({ timeout: 20_000 })

    // Resultados: ao menos um card de artigo para um termo tirado de um título real.
    const cards = articleLinks(page)
    await expect(cards.first()).toBeVisible({ timeout: 20_000 })
    expect(
      await cards.count(),
      `busca por "${term}" (do título "${article.title}") deveria ter resultados`,
    ).toBeGreaterThan(0)
  })

  test('detalhe /artigos/[uniqueId] renderiza título e relacionados', async ({
    page,
  }) => {
    const article = await deriveFirstArticle()
    const related = await publicGraphQL<{
      relatedArticles: Array<{ uniqueId: string }>
    }>(RELATED_ARTICLES_QUERY, { uniqueId: article.uniqueId, limit: 4 })

    await page.goto(`/artigos/${encodeURIComponent(article.uniqueId)}`)

    // O título do artigo é o <h1> da página (ClientArticle).
    await expect(
      page.getByRole('heading', { level: 1, name: article.title }),
    ).toBeVisible({ timeout: 20_000 })

    // Seção de relacionados só renderiza quando `relatedArticles` retorna dados.
    if (related.relatedArticles.length > 0) {
      await expect(
        page.getByRole('heading', { name: 'Notícias relacionadas' }),
      ).toBeVisible({ timeout: 20_000 })
      // E os cards relacionados são links para outros artigos.
      const relatedSection = page
        .locator('section')
        .filter({ hasText: 'Notícias relacionadas' })
      await expect(
        relatedSection.locator('a[href^="/artigos/"]').first(),
      ).toBeVisible({ timeout: 20_000 })
    }
  })

  test('listagem /temas renderiza e /temas/[label] renderiza artigos', async ({
    page,
  }) => {
    const themeLabel = await deriveThemeWithArticles()

    // Listagem de temas: deve linkar para detalhes de tema.
    await page.goto('/temas')
    await expect(page.locator('a[href^="/temas/"]').first()).toBeVisible({
      timeout: 20_000,
    })

    // Detalhe do tema (label URL-encoded). Cabeçalho = label; deve listar artigos.
    await page.goto(`/temas/${encodeURIComponent(themeLabel)}`)
    await expect(page.getByRole('heading', { name: themeLabel })).toBeVisible({
      timeout: 20_000,
    })

    const cards = articleLinks(page)
    await expect(cards.first()).toBeVisible({ timeout: 20_000 })
    expect(
      await cards.count(),
      `tema "${themeLabel}" deveria listar artigos`,
    ).toBeGreaterThan(0)
  })

  test('detalhe /orgaos/[key] renderiza artigos do órgão', async ({ page }) => {
    const agency = await deriveAgencyWithArticles()

    await page.goto(`/orgaos/${encodeURIComponent(agency.code)}`)

    // Cabeçalho do órgão = nome da agência (h2, AgencyPageClient). O nome vem do
    // YAML do portal (agencies-utils), então assertamos no subtítulo institucional
    // estável em vez do label do GraphQL para evitar divergência de fonte.
    await expect(
      page.getByText(
        'Acompanhe as notícias e publicações oficiais deste órgão.',
      ),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({
      timeout: 20_000,
    })

    const cards = articleLinks(page)
    await expect(cards.first()).toBeVisible({ timeout: 20_000 })
    expect(
      await cards.count(),
      `órgão "${agency.code}" (${agency.label}) deveria listar artigos`,
    ).toBeGreaterThan(0)
  })
})
