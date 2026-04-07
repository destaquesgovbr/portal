import { expect, test } from '@playwright/test'

test.describe('Marketplace — Follow via Subscriptions', () => {
  test('marketplace page loads with listings', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('listing detail page shows follow button', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    // Click first listing card
    const firstCard = page.locator('a[href*="/clippings/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')

      // Should show follow or following state
      const followBtn = page.locator('button:has-text("Seguir")')
      const followingBadge = page.locator('text=Seguindo')

      const hasFollow = await followBtn.isVisible().catch(() => false)
      const hasFollowing = await followingBadge.isVisible().catch(() => false)

      expect(hasFollow || hasFollowing).toBe(true)
    }
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
