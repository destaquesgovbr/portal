import { expect, test } from '@playwright/test'

/**
 * Taxonomia de temas no portal (PO-1: tema 26).
 *
 * Asserções independentes de dados: só cabeçalho, cards e árvore, nunca a
 * contagem de artigos (antes da migração 034 o tema 26 ainda não tem notícias).
 *
 * Roda contra o portal local apontando para qualquer graphql-api, ex.:
 *   NEXT_PUBLIC_GRAPHQL_URL=<graphql-api>/graphql pnpm dev
 *   pnpm exec playwright test e2e/temas.spec.ts --project=chromium --no-deps
 */

const TEMA_26 = 'Defesa Civil e Gestão de Desastres'

test.describe('Temas — taxonomia atual', () => {
  test('/temas lista o card do tema 26 e não lista os L1 removidos', async ({
    page,
  }) => {
    await page.goto('/temas')

    const card26 = page.locator(`a[href="/temas/${TEMA_26}"]`)
    await expect(card26).toBeVisible()
    await expect(card26.getByRole('img', { name: TEMA_26 })).toHaveAttribute(
      'src',
      '/26-defesa-civil-e-gestao-de-desastres.svg',
    )

    await expect(
      page.locator('a[href="/temas/Eventos Oficiais e Cerimônias"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('a[href="/temas/Estatísticas e Dados Públicos"]'),
    ).toHaveCount(0)
  })

  test('/temas/[tema 26] renderiza cabeçalho, ícone e feed do código 26', async ({
    page,
  }) => {
    await page.goto(`/temas/${encodeURIComponent(TEMA_26)}`)

    await expect(page.getByRole('heading', { name: TEMA_26 })).toBeVisible()
    await expect(
      page.locator('section').getByRole('img', { name: TEMA_26 }),
    ).toHaveAttribute('src', '/26-defesa-civil-e-gestao-de-desastres.svg')
    await expect(page.locator('a[href="/feed.xml?temas=26"]')).toBeVisible()
    await expect(
      page.getByText('Ocorreu um erro ao carregar os artigos.'),
    ).toHaveCount(0)
  })

  test('/temas/[label sem ícone] cai no ícone genérico em vez de quebrar', async ({
    page,
  }) => {
    for (const label of ['Eventos Oficiais e Cerimônias', 'Tema Inexistente']) {
      await page.goto(`/temas/${encodeURIComponent(label)}`)

      await expect(page.getByRole('heading', { name: label })).toBeVisible()
      await expect(
        page.locator('section').getByRole('img', { name: label }),
      ).toHaveAttribute('src', '/tema-generico.svg')
    }
  })
})
