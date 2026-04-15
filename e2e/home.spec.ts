import { expect, test } from '@playwright/test'

test.describe('Home Page (landing)', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check that the page has loaded with the main heading
    await expect(page).toHaveTitle(/Destaques/)

    // Check that the main content area exists
    const main = page.locator('main').first()
    await expect(main).toBeVisible()
  })

  test('should display landing hero', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('heading', { name: /web difusora do governo federal/i }),
    ).toBeVisible()
  })

  test('should display key landing sections', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('heading', { name: /dois fluxos/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /em desenvolvimento/i }),
    ).toBeVisible()
  })

  test('should have header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('header Notícias link goes to /noticias', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const link = page
      .locator('nav')
      .getByRole('link', { name: /notícias/i })
      .first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/noticias')
  })

  test('header has no Para Órgãos link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const link = page.locator('nav').getByRole('link', { name: /para órgãos/i })
    await expect(link).toHaveCount(0)
  })
})

test.describe('Web Difusora showcase', () => {
  test('should load the showcase page', async ({ page }) => {
    await page.goto('/web-difusora', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('heading', { name: /web difusora/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /cada elemento/i }),
    ).toBeVisible()
  })
})

test.describe('Search Page', () => {
  test('should navigate to search page', async ({ page }) => {
    await page.goto('/busca', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/busca/)
  })

  test('should have search functionality', async ({ page, viewport }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // On mobile, we need to click the search button to reveal the search bar
    const isMobile = viewport && viewport.width < 768
    if (isMobile) {
      const searchButton = page.locator('button:has(svg.lucide-search)')
      await searchButton.first().click()
      await page.waitForTimeout(200)
    }

    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await expect(searchInput).toBeVisible()
  })
})
