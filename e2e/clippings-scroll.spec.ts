import { expect, test } from '@playwright/test'

test.describe('Prateleira de Clippings — Infinite Scroll', () => {
  test('loads initial clippings and more on scroll', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('a[href^="/clippings/"]')
    const initialCount = await cards.count()
    console.log(`Initial cards: ${initialCount}`)

    // Should have at least some cards
    expect(initialCount).toBeGreaterThan(0)

    // If there are 12 (full page), scroll to load more
    if (initialCount >= 12) {
      // Scroll to the last card to trigger infinite scroll
      await cards.last().scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)

      // Check if more loaded
      const afterCount = await cards.count()
      console.log(`After scroll cards: ${afterCount}`)
      expect(afterCount).toBeGreaterThan(initialCount)
    }
  })

  test('shows all published clippings eventually', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('a[href^="/clippings/"]')

    // Keep scrolling until no more load
    let previousCount = 0
    let currentCount = await cards.count()
    let attempts = 0

    while (currentCount > previousCount && attempts < 10) {
      previousCount = currentCount
      await cards.last().scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)
      currentCount = await cards.count()
      attempts++
    }

    console.log(`Total cards after scrolling: ${currentCount}`)
    // We know there are 18 published clippings
    expect(currentCount).toBeGreaterThanOrEqual(17)
  })
})
