import { expect, test } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check that the page has loaded with the main heading
    await expect(page).toHaveTitle(/Destaques/)

    // Check that the main content area exists
    const main = page.locator('main').first()
    await expect(main).toBeVisible()
  })

  test('should display news content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Wait for page to fully load and check for any content
    // Look for links that go to /artigos (news articles)
    const articleLinks = page.locator('a[href*="/artigos/"]')
    await expect(articleLinks.first()).toBeVisible({ timeout: 15000 })
  })

  test('should have header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check that the header exists
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })
})

test.describe('Search Page', () => {
  test('should navigate to search page', async ({ page }) => {
    await page.goto('/busca', { waitUntil: 'domcontentloaded' })

    // Check that search page loads
    await expect(page).toHaveURL(/busca/)
  })

  test('should have search functionality', async ({ page, viewport }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // On mobile, we need to click the search button to reveal the search bar
    const isMobile = viewport && viewport.width < 768
    if (isMobile) {
      const searchButton = page.locator('button:has(svg.lucide-search)')
      await searchButton.first().click()
      // Wait a bit for the overlay to appear
      await page.waitForTimeout(200)
    }

    // The search input should now be visible
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Articles Page', () => {
  test('should load articles page', async ({ page }) => {
    await page.goto('/artigos', { waitUntil: 'domcontentloaded' })

    // Check that articles page loads
    await expect(page).toHaveURL(/artigos/)

    // Wait for some content to load
    const main = page.locator('main').first()
    await expect(main).toBeVisible()
  })
})
