/**
 * Pré-flight de dados para a suíte E2E GraphQL.
 *
 * Em vez de `test.skip()` data-dependent espalhado (anti-padrão da suíte
 * antiga), centralizamos aqui a verificação das pré-condições. Se faltar dado
 * essencial (temas no Postgres, artigos no Typesense), falhamos com mensagem
 * acionável — não pulamos silenciosamente.
 *
 * Roda sem auth (queries públicas), direto no `graphql-api` local.
 */

import { graphqlApiUrl } from './graphql-client'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

async function publicQuery<T>(query: string): Promise<T> {
  const url = graphqlApiUrl()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    })
  } catch (err) {
    throw new Error(
      `Não consegui falar com o graphql-api em ${url}: ${(err as Error).message}. ` +
        `Suba-o com 'make dev' no diretório graphql-api antes de rodar os testes.`,
    )
  }
  if (!res.ok) {
    throw new Error(`graphql-api health-check HTTP ${res.status} em ${url}`)
  }
  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    throw new Error(
      `graphql-api retornou erros no pré-flight: ${json.errors
        .map((e) => e.message)
        .join('; ')}`,
    )
  }
  if (!json.data) {
    throw new Error('graphql-api retornou data vazio no pré-flight')
  }
  return json.data
}

/**
 * Verifica que o graphql-api está no ar e tem os dados mínimos para os specs:
 * temas (Postgres) e artigos (Typesense). Lança com mensagem acionável se não.
 */
export async function assertDataPreconditions(): Promise<void> {
  const themesData = await publicQuery<{
    themes: Array<{ code: string; label: string }>
  }>(`{ themes { code label } }`)
  if (!themesData.themes?.length) {
    throw new Error(
      'Pré-condição falhou: nenhum tema retornado por `themes`. ' +
        'O Postgres (govbrnews) está acessível e populado? Verifique DATABASE_URL.',
    )
  }

  const articlesData = await publicQuery<{
    articles: { found: number }
  }>(`{ articles(page: 1, limit: 1) { found } }`)
  if (!articlesData.articles || articlesData.articles.found <= 0) {
    throw new Error(
      'Pré-condição falhou: `articles.found` <= 0. ' +
        'O Typesense está acessível e indexado? Verifique TYPESENSE_READ_CONN.',
    )
  }
}
