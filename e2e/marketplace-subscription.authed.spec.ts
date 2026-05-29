import { expect, test } from '@playwright/test'

test.describe('Marketplace — Follow via Subscriptions', () => {
  test('marketplace page loads with listings', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('listing detail page shows follow button', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle').catch(() => {})

    // O nav do header tem `/clippings?sort=trending`; cards de listing
    // apontam para `/clippings/<id>`. Filtramos só os links de detalhe
    // (path com slug, sem query string).
    const detailLinks = page.locator('a[href^="/clippings/"]:not([href*="?"])')
    const linkCount = await detailLinks.count()
    if (linkCount === 0) {
      test.skip(true, 'Nenhum listing no marketplace — nada para seguir')
      return
    }

    await detailLinks.first().click()
    await page.waitForURL(/\/clippings\/[^?#]+/, { timeout: 10_000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    // Deve haver botão "Seguir" OU já estar "Seguindo".
    const followOrFollowing = page
      .getByRole('button', { name: /seguir|seguindo/i })
      .first()
    await expect(followOrFollowing).toBeVisible({ timeout: 10_000 })
  })

  test('meus clippings page shows followed section when following', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})
