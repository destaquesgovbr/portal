/**
 * E2E — Jornada de clippings via GraphQL (flag `graphql.clippings`).
 *
 * Cobre o caminho REAL browser → portal → graphql-api local. Diferente da
 * suíte antiga, NÃO usa `test.skip` data-dependent nem catches silenciosos:
 * as fixtures garantem o estado e as asserções são fortes.
 *
 * Pré-requisitos (ver portal/CLAUDE.md › "Suíte E2E GraphQL local"):
 *   - graphql-api em :8000 (`make dev`)
 *   - portal em :3000 (`pnpm dev`)
 *   - `source scripts/e2e/load-creds.sh` (E2E_BOT_PASSWORD + AUTH_SECRET)
 *   - PLAYWRIGHT_BASE_URL=http://localhost:3000
 *   - flag `graphql.clippings` force:true no env dev do GrowthBook
 */

import { expect, test } from '@playwright/test'
import {
  assertDataPreconditions,
  cleanupTestClippings,
  createE2EGraphQLClient,
  type E2EGraphQLClient,
  makeClipping,
  removeClipping,
} from '../fixtures'

let client: E2EGraphQLClient

// URL da LISTAGEM (não casa com /novo nem /editar). Usada para esperar o
// redirect REAL após criar/editar — evita falso-positivo onde a própria URL do
// wizard (/novo) casaria com um regex permissivo, fazendo o teste checar o
// backend antes da mutation completar.
const LISTING_URL = /\/minha-conta\/clipping(\?[^/]*)?$/

test.beforeAll(async () => {
  await assertDataPreconditions()
  client = await createE2EGraphQLClient()
  // Limpa lixo de runs anteriores que tenham crashado antes do teardown.
  await cleanupTestClippings(client)
})

test.afterAll(async () => {
  // Garantia final: remove qualquer clipping E2E_TEST_ remanescente.
  await cleanupTestClippings(client)
})

test.describe('Clippings — CRUD via GraphQL', () => {
  test('lista os clippings do usuário (page render)', async ({ page }) => {
    // Seed: garante ao menos um clipping conhecido.
    const seeded = await makeClipping(client, { suffix: 'lista' })

    await page.goto('/minha-conta/clipping')
    await expect(
      page.getByRole('heading', { name: 'Meus Clippings' }).first(),
    ).toBeVisible()

    // O clipping seedado deve aparecer pelo nome (asserção forte, sem skip).
    await expect(page.getByText(seeded.name).first()).toBeVisible({
      timeout: 10_000,
    })

    await removeClipping(client, seeded.id)
  })

  test('cria clipping pelo wizard manual e ele aparece na listagem', async ({
    page,
  }) => {
    const name = 'E2E_TEST_wizard_create'

    await page.goto('/minha-conta/clipping/novo')
    await page.click('text=Configuração manual')
    await expect(page.locator('#clipping-name')).toBeVisible()

    await page.fill('#clipping-name', name)

    const recorteTitle = page.locator('input[placeholder*="Educação Superior"]')
    await recorteTitle.fill('Recorte E2E')

    const keywordInput = page.locator('input[placeholder*="palavra-chave"]')
    await keywordInput.fill('vacinação')
    await keywordInput.press('Enter')

    // Recortes → Agendamento
    await page.click('button:has-text("ximo")')
    // Agendamento → Canais
    await page.click('button:has-text("ximo")')

    // Canal email.
    await page.locator('label:has-text("Email")').click()

    const confirmBtn = page.locator('button:has-text("Confirmar")')
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Redireciona para a listagem.
    await expect(page).toHaveURL(LISTING_URL, { timeout: 15_000 })

    // Confirma que persistiu no backend via GraphQL (não só na UI).
    const data = await client.execute<{
      clippings: Array<{ id: string; name: string }>
    }>(`{ clippings { id name } }`)
    const created = data.clippings.find((c) => c.name === name)
    expect(
      created,
      `clipping "${name}" deveria existir no backend após criação pelo wizard`,
    ).toBeTruthy()

    if (created) {
      await removeClipping(client, created.id)
    }
  })

  test('edita o nome de um clipping existente', async ({ page }) => {
    const seeded = await makeClipping(client, { suffix: 'edit' })
    const newName = 'E2E_TEST_edit_renamed'

    await page.goto(`/minha-conta/clipping/${seeded.id}/editar`)
    await expect(page.locator('#clipping-name')).toBeVisible({
      timeout: 10_000,
    })

    await page.fill('#clipping-name', newName)

    // Navega até Canais e garante ≥1 canal (o submit valida todos os passos).
    await page.click('button:has-text("ximo")')
    await page.click('button:has-text("ximo")')
    const emailLabel = page.locator('label:has-text("Email")')
    // Marca email se ainda não estiver marcado (clipping seedado não tem canal).
    if (await emailLabel.isVisible()) {
      await emailLabel.click()
    }

    await page.click('button:has-text("Salvar"), button:has-text("Confirmar")')

    await expect(page).toHaveURL(LISTING_URL, { timeout: 15_000 })

    // Verifica no backend que o nome mudou.
    const data = await client.execute<{
      clippings: Array<{ id: string; name: string }>
    }>(`{ clippings { id name } }`)
    const updated = data.clippings.find((c) => c.id === seeded.id)
    expect(updated?.name).toBe(newName)

    await removeClipping(client, seeded.id)
  })

  test('exclui um clipping pelo dropdown do card', async ({ page }) => {
    const seeded = await makeClipping(client, { suffix: 'delete' })

    await page.goto('/minha-conta/clipping')
    const card = page
      .locator('[data-testid="clipping-card"]')
      .filter({ hasText: seeded.name })
    await expect(card).toBeVisible({ timeout: 10_000 })

    await card.locator('button[aria-haspopup="menu"]').first().click()
    // O delete é um fluxo de 2 passos no próprio dropdown: "Excluir" revela
    // "Confirmar exclusão".
    await page.getByRole('menuitem', { name: /^excluir$/i }).click()
    await page.getByRole('menuitem', { name: /confirmar exclusão/i }).click()

    // Some da listagem.
    await expect(card).toHaveCount(0, { timeout: 10_000 })

    // E sumiu do backend.
    const data = await client.execute<{
      clippings: Array<{ id: string }>
    }>(`{ clippings { id } }`)
    expect(data.clippings.find((c) => c.id === seeded.id)).toBeFalsy()
  })
})
