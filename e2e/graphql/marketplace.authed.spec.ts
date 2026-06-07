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

  test('página pública de edições do listing renderiza (releases via facade GraphQL)', async ({
    page,
  }) => {
    // Migração R1: o loadMore das edições PÚBLICAS do `ReleaseList` passou da
    // rota REST `/api/clippings/public/[listingId]/releases` para o campo
    // GraphQL `marketplaceListing(id) { releases }` (conteúdo público de um
    // listing ativo, exposto pelo graphql-api). Aqui dirigimos a página pública
    // de edições no browser — caminho real browser → portal → graphql-api.
    // O listing do beforeEach é recém-publicado (clipping sem releases geradas
    // pelo worker), então validamos o empty-state, que prova que a query
    // pública (com `articlesCount`) é aceita pelo schema real e a página monta.
    await page.goto(`/clippings/${listing.id}/releases`)

    // Título da página de edições (a página carregou — listing ativo).
    await expect(page.getByRole('heading', { name: /edições —/i })).toBeVisible(
      { timeout: 15_000 },
    )

    // Sem releases, o ReleaseList mostra o empty-state.
    await expect(page.getByText('Nenhuma edição publicada ainda')).toBeVisible({
      timeout: 10_000,
    })
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

  test('unpublish pela UI de "Meus Clippings" desativa o listing no backend', async ({
    page,
  }) => {
    // Regressão (bug R1): o botão "Despublicar" do ClippingCard ainda chamava a
    // rota REST stale `/api/clippings/public/[listingId]` (DELETE), que escrevia
    // na subcoleção antiga `users/{uid}/clippings/{id}` → batch falhava com
    // "No document to update" → 500 → o listing nunca era desativado. Após a
    // migração para o facade GraphQL (`unpublishFromMarketplace`), o fluxo
    // browser → portal → graphql-api deve funcionar ponta-a-ponta.
    //
    // Diferente do teste acima (que chama o fixture direto), este dirige a UI
    // real — é o caminho que a regressão escapou (e2e só batia no fixture).

    // Sanidade: o listing do beforeEach está ativo.
    const before = await client.execute<{
      marketplaceListing: { id: string } | null
    }>(LISTING_QUERY, { id: listing.id })
    expect(before.marketplaceListing?.id).toBe(listing.id)

    await page.goto('/minha-conta/clipping')
    await waitForAuthReady(page)

    // Localiza o card do clipping-fonte (publicado no beforeEach).
    const card = page
      .locator('[data-testid="clipping-card"]')
      .filter({ hasText: clipping.name })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Abre o dropdown de ações do card.
    await card.locator('button[aria-haspopup="menu"]').first().click()

    // Fluxo de 2 passos: "Despublicar" revela "Confirmar despublicação".
    await page.getByRole('menuitem', { name: /^despublicar$/i }).click()
    await page.getByRole('menuitem', { name: /confirmar despublica/i }).click()

    // Valida no backend (não na UI): `get_marketplace_listing` filtra
    // `active=false` → retorna null quando o listing foi desativado.
    await expect
      .poll(
        async () => {
          const r = await client.execute<{
            marketplaceListing: { id: string } | null
          }>(LISTING_QUERY, { id: listing.id })
          return r.marketplaceListing
        },
        { timeout: 10_000 },
      )
      .toBeNull()
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
