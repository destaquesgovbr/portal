/**
 * E2E — Jornada de marketplace via GraphQL (flag `graphql.marketplace`).
 *
 * Publica um clipping (fixture), exercita like/follow/clone pela UI e valida o
 * efeito no backend via GraphQL direto. Cleanup garantido no `afterAll`.
 *
 * Pré-requisitos: ver `clippings.authed.spec.ts`.
 */

import { expect, test } from '@playwright/test'
import {
  assertDataPreconditions,
  type CreatedClipping,
  type CreatedListing,
  cleanupTestClippings,
  createE2EGraphQLClient,
  type E2EGraphQLClient,
  makeClipping,
  publishListing,
  removeClipping,
  unpublishListing,
} from '../fixtures'

let client: E2EGraphQLClient
let clipping: CreatedClipping
let listing: CreatedListing

const LISTING_QUERY = /* GraphQL */ `
  query Listing($id: String!) {
    marketplaceListing(id: $id) {
      id
      likeCount
      followerCount
      cloneCount
      hasLiked
      hasFollowed
    }
  }
`

test.beforeAll(async () => {
  await assertDataPreconditions()
  client = await createE2EGraphQLClient()
  await cleanupTestClippings(client)
})

// Cada teste usa um listing FRESCO (isolamento) — evita interferência entre os
// testes serializados (like/follow/clone mutam o mesmo recurso).
test.beforeEach(async () => {
  clipping = await makeClipping(client, { suffix: 'mkt_source' })
  listing = await publishListing(client, clipping.id, { suffix: 'mkt' })
})

test.afterEach(async () => {
  await unpublishListing(client, listing.id).catch((err) => {
    // listing pode já ter sido removido por um teste — registra e segue para
    // limpar o resto (não silenciar: o erro vai pro log do runner).
    console.warn('teardown unpublish:', (err as Error).message)
  })
  await cleanupTestClippings(client)
})

// As ações (like/follow/clone) chamam `requireAuth()` no clique, que checa
// `useSession()`. Se a sessão ainda não resolveu, a ação faz push para /signin
// silenciosamente. Esperamos o avatar do usuário (header) antes de interagir —
// sinal de que a sessão client-side está carregada.
async function waitForAuthReady(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: /^EB$/ })).toBeVisible({
    timeout: 15_000,
  })
}

test.describe('Marketplace via GraphQL', () => {
  test('listing publicado aparece na galeria pública', async ({ page }) => {
    await page.goto('/clippings')
    await expect(page.getByText(/galeria de clippings/i)).toBeVisible()

    // O listing seedado deve ser acessível pela rota de detalhe.
    await page.goto(`/clippings/${listing.id}`)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', { name: /seguir|seguindo/i }),
    ).toBeVisible()
  })

  test('like incrementa o contador no backend', async ({ page }) => {
    // Listing fresco: hasLiked começa false; clicar "Curtir" deve levá-lo a true.
    await page.goto(`/clippings/${listing.id}`)
    await waitForAuthReady(page)
    const likeButton = page
      .getByRole('button', { name: /curtir|curtido/i })
      .first()
    await expect(likeButton).toBeVisible({ timeout: 10_000 })
    await likeButton.click()

    // Valida no backend (não na UI).
    await expect
      .poll(
        async () => {
          const r = await client.execute<{
            marketplaceListing: { hasLiked: boolean }
          }>(LISTING_QUERY, { id: listing.id })
          return r.marketplaceListing.hasLiked
        },
        { timeout: 10_000 },
      )
      .toBe(true)
  })

  test('follow: fluxo UI → subscribeToClipping conclui com sucesso', async ({
    page,
  }) => {
    // Limitação: o bot é o AUTOR deste listing. Por design, o autor não "segue"
    // o próprio clipping — `subscribeToClipping` retorna role=AUTHOR e
    // `hasFollowed` permanece false (é para subscribers não-autores). Validar
    // `hasFollowed=true` exigiria um segundo usuário. Aqui validamos que o fluxo
    // UI → GraphQL conclui sem erro (toast de sucesso), exercitando o caminho.
    await page.goto(`/clippings/${listing.id}`)
    await waitForAuthReady(page)
    await page
      .getByRole('button', { name: /^seguir$/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/escolha como deseja receber/i)).toBeVisible()
    // Email já vem marcado por padrão → "Seguir" habilitado; confirma direto.
    await dialog.getByRole('button', { name: /^seguir$/i }).click()

    // Sucesso: toast confirmando + dialog fecha (sem erro de mutation).
    await expect(
      page.getByText(/agora voc.* est.* seguindo|configura.* atualizadas/i),
    ).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toBeHidden()
  })

  test('clone cria um novo clipping para o usuário', async ({ page }) => {
    // Conta clippings autorados ANTES do clone.
    const countAuthored = async () => {
      const data = await client.execute<{
        clippings: Array<{ id: string; isAuthor: boolean }>
      }>(`{ clippings { id isAuthor } }`)
      return data.clippings.filter((c) => c.isAuthor).length
    }
    const before = await countAuthored()

    await page.goto(`/clippings/${listing.id}`)
    await waitForAuthReady(page)
    const cloneButton = page
      .getByRole('button', { name: /clonar|clone|usar este/i })
      .first()
    await expect(cloneButton).toBeVisible({ timeout: 10_000 })
    await cloneButton.click()

    // O clone cria um novo clipping autorado → contagem sobe em 1.
    await expect.poll(countAuthored, { timeout: 10_000 }).toBe(before + 1)
  })

  test('unpublish desativa o listing no backend', async () => {
    // Sanidade: o listing do beforeEach está ativo (a query o retorna).
    const before = await client.execute<{
      marketplaceListing: { id: string } | null
    }>(LISTING_QUERY, { id: listing.id })
    expect(before.marketplaceListing?.id).toBe(listing.id)

    await unpublishListing(client, listing.id)

    // `get_marketplace_listing` filtra `active=false` → retorna null.
    const after = await client.execute<{
      marketplaceListing: { id: string } | null
    }>(LISTING_QUERY, { id: listing.id })
    expect(after.marketplaceListing).toBeNull()
  })

  test('unpublish funciona mesmo com o clipping-fonte já excluído', async () => {
    // Regressão (bug pego em staging): publicar → excluir o clipping → unpublish.
    // Antes, o unpublish fazia `update` no clipping inexistente e o batch
    // inteiro falhava ("No document to update"), deixando o listing ativo.
    await removeClipping(client, clipping.id)

    // Não deve lançar; o soft-delete do listing precisa commitar mesmo assim.
    await unpublishListing(client, listing.id)

    const after = await client.execute<{
      marketplaceListing: { id: string } | null
    }>(LISTING_QUERY, { id: listing.id })
    expect(after.marketplaceListing).toBeNull()
  })
})
