import { expect, test } from '@playwright/test'

/**
 * E2E tests for the follow-as-broadcast flow.
 *
 * Pre-requisite: at least one published listing in the marketplace
 * that the authenticated user did NOT author.
 *
 * These tests are data-dependent — they skip gracefully when
 * prerequisites are not met.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function navigateToFirstListing(page: import('@playwright/test').Page) {
  await page.goto('/marketplace')
  const cards = page.locator('a[href^="/clippings/"]')
  const count = await cards.count()
  if (count === 0) return null
  await cards.first().click()
  await page.waitForURL(/\/clippings\//)
  return page
}

async function getFollowButton(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /seguir/i }).first()
}

async function getFollowingButton(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /seguindo/i }).first()
}

// ---------------------------------------------------------------------------
// Follow Dialog
// ---------------------------------------------------------------------------

test.describe('Follow — Dialog de canais', () => {
  test('dialog mostra apenas canais de entrega, sem seleção de horário', async ({
    page,
  }) => {
    const nav = await navigateToFirstListing(page)
    test.skip(!nav, 'Nenhum listing no marketplace')

    const followBtn = await getFollowButton(page)
    const isFollowVisible = await followBtn.isVisible()
    test.skip(!isFollowVisible, 'Usuário já segue ou é autor')

    await followBtn.click()

    // Dialog deve mostrar canais
    await expect(page.getByText(/como deseja receber/i)).toBeVisible()

    // Checkbox Email deve existir e estar marcado por padrão
    const emailCheckbox = page.getByRole('checkbox', { name: /email/i })
    await expect(emailCheckbox).toBeVisible()
    await expect(emailCheckbox).toBeChecked()

    // Checkbox Telegram deve existir
    await expect(
      page.getByRole('checkbox', { name: /telegram/i }),
    ).toBeVisible()

    // Checkbox Push deve existir
    await expect(page.getByRole('checkbox', { name: /push/i })).toBeVisible()

    // Schedule select NÃO deve existir
    await expect(page.locator('select')).not.toBeVisible()
    await expect(page.getByText(/horário de entrega/i)).not.toBeVisible()

    // Botão Seguir no dialog
    await expect(page.getByRole('button', { name: /^seguir$/i })).toBeVisible()
  })

  test('botão seguir desabilitado quando nenhum canal selecionado', async ({
    page,
  }) => {
    const nav = await navigateToFirstListing(page)
    test.skip(!nav, 'Nenhum listing')

    const followBtn = await getFollowButton(page)
    test.skip(!(await followBtn.isVisible()), 'Não pode seguir')

    await followBtn.click()

    // Desmarcar email (default checked)
    const emailCheckbox = page.getByRole('checkbox', { name: /email/i })
    await emailCheckbox.uncheck()

    // Desmarcar telegram e push caso estejam marcados
    const tgCheckbox = page.getByRole('checkbox', { name: /telegram/i })
    if (await tgCheckbox.isChecked()) await tgCheckbox.uncheck()

    const pushCheckbox = page.getByRole('checkbox', { name: /push/i })
    if (await pushCheckbox.isChecked()) await pushCheckbox.uncheck()

    // Botão seguir deve estar desabilitado
    const submitBtn = page.getByRole('button', { name: /^seguir$/i })
    await expect(submitBtn).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Follow + Unfollow flow
// ---------------------------------------------------------------------------

test.describe('Follow — Fluxo completo seguir e deixar de seguir', () => {
  test('seguir listing, verificar botão muda, e depois unfollow', async ({
    page,
  }) => {
    const nav = await navigateToFirstListing(page)
    test.skip(!nav, 'Nenhum listing')

    const followBtn = await getFollowButton(page)
    test.skip(!(await followBtn.isVisible()), 'Não pode seguir')

    // Capturar contador antes
    const counterBefore = await followBtn.textContent()

    // 1. Abrir dialog e seguir com email
    await followBtn.click()
    await expect(page.getByText(/como deseja receber/i)).toBeVisible()

    const emailCheckbox = page.getByRole('checkbox', { name: /email/i })
    await expect(emailCheckbox).toBeChecked()

    const submitBtn = page.getByRole('button', { name: /^seguir$/i })
    await submitBtn.click()

    // 2. Dialog fecha e botão muda para "Seguindo"
    await expect(page.getByText(/como deseja receber/i)).not.toBeVisible({
      timeout: 10000,
    })

    const followingBtn = await getFollowingButton(page)
    await expect(followingBtn).toBeVisible({ timeout: 5000 })

    // 3. Reload e verificar que continua seguindo
    await page.reload()
    await expect(
      page.getByRole('button', { name: /seguindo/i }).first(),
    ).toBeVisible({ timeout: 5000 })

    // 4. Unfollow
    const unfollowBtn = page.getByRole('button', { name: /seguindo/i }).first()
    await unfollowBtn.click()

    // 5. Botão volta para "Seguir"
    await expect(
      page.getByRole('button', { name: /^seguir/i }).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Follow não cria clipping
// ---------------------------------------------------------------------------

test.describe('Follow — Não cria clipping do usuário', () => {
  test('após seguir, listing NÃO aparece em Meus Clippings', async ({
    page,
  }) => {
    // Primeiro, seguir um listing
    const nav = await navigateToFirstListing(page)
    test.skip(!nav, 'Nenhum listing')

    const followBtn = await getFollowButton(page)
    if (!(await followBtn.isVisible())) {
      // Pode já estar seguindo — tentar unfollow primeiro
      const followingBtn = await getFollowingButton(page)
      if (await followingBtn.isVisible()) {
        await followingBtn.click()
        await page.waitForTimeout(1000)
      }
      // Agora tentar seguir
      const retryBtn = await getFollowButton(page)
      test.skip(!(await retryBtn.isVisible()), 'Não consegue seguir')
      await retryBtn.click()
    } else {
      await followBtn.click()
    }

    // Seguir com email
    await expect(page.getByText(/como deseja receber/i)).toBeVisible()
    await page.getByRole('button', { name: /^seguir$/i }).click()
    await expect(page.getByText(/como deseja receber/i)).not.toBeVisible({
      timeout: 10000,
    })

    // Navegar para Meus Clippings
    await page.goto('/minha-conta/clipping')
    await expect(
      page.getByRole('heading', { name: 'Meus Clippings' }).first(),
    ).toBeVisible()

    // Verificar que NÃO existe badge "Seguindo" em nenhum card
    const followBadges = page.locator(
      '[data-testid="clipping-card"] >> text=Seguindo',
    )
    await expect(followBadges).toHaveCount(0)

    // Cleanup: unfollow
    const navBack = await navigateToFirstListing(page)
    if (navBack) {
      const unfollowBtn = page
        .getByRole('button', { name: /seguindo/i })
        .first()
      if (await unfollowBtn.isVisible()) {
        await unfollowBtn.click()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Follow — Follower count
// ---------------------------------------------------------------------------

test.describe('Follow — Contador de seguidores', () => {
  test('contador incrementa ao seguir e decrementa ao deixar de seguir', async ({
    page,
  }) => {
    const nav = await navigateToFirstListing(page)
    test.skip(!nav, 'Nenhum listing')

    // Verificar se pode seguir
    const followBtn = await getFollowButton(page)
    test.skip(!(await followBtn.isVisible()), 'Não pode seguir')

    // Capturar follower count antes (do botão)
    const textBefore = (await followBtn.textContent()) || ''
    const countBefore = Number.parseInt(
      textBefore.replace(/\D/g, '') || '0',
      10,
    )

    // Seguir
    await followBtn.click()
    await expect(page.getByText(/como deseja receber/i)).toBeVisible()
    await page.getByRole('button', { name: /^seguir$/i }).click()
    await expect(page.getByText(/como deseja receber/i)).not.toBeVisible({
      timeout: 10000,
    })

    // Verificar que contador incrementou
    const followingBtn = await getFollowingButton(page)
    await expect(followingBtn).toBeVisible({ timeout: 5000 })
    const textAfterFollow = (await followingBtn.textContent()) || ''
    const countAfterFollow = Number.parseInt(
      textAfterFollow.replace(/\D/g, '') || '0',
      10,
    )
    expect(countAfterFollow).toBe(countBefore + 1)

    // Unfollow
    await followingBtn.click()
    await page.waitForTimeout(1000)

    // Verificar que contador decrementou
    const unfollowedBtn = await getFollowButton(page)
    await expect(unfollowedBtn).toBeVisible({ timeout: 5000 })
    const textAfterUnfollow = (await unfollowedBtn.textContent()) || ''
    const countAfterUnfollow = Number.parseInt(
      textAfterUnfollow.replace(/\D/g, '') || '0',
      10,
    )
    expect(countAfterUnfollow).toBe(countBefore)
  })
})
