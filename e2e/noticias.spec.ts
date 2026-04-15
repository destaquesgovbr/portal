import { expect, test } from '@playwright/test'

test.describe('Notícias Page (news aggregator)', () => {
  test('should load the noticias page', async ({ page }) => {
    await page.goto('/noticias', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveTitle(/Destaques/)

    const main = page.locator('main').first()
    await expect(main).toBeVisible()
  })

  test('should display news content', async ({ page }) => {
    await page.goto('/noticias', { waitUntil: 'domcontentloaded' })

    // Look for links that go to /artigos (individual news articles)
    const articleLinks = page.locator('a[href*="/artigos/"]')
    await expect(articleLinks.first()).toBeVisible({ timeout: 15000 })
  })

  test('should have header', async ({ page }) => {
    await page.goto('/noticias', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header')
    await expect(header).toBeVisible()
  })
})
