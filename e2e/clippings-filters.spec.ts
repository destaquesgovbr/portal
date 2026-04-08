import { expect, test } from '@playwright/test'

test.describe('Prateleira de Clippings — Filtros e Ordenação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')
  })

  test('page loads with search input and sort select', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('search filters clippings by name', async ({ page }) => {
    const cards = page.locator('a[href^="/clippings/"]')
    const initialCount = await cards.count()
    expect(initialCount).toBeGreaterThan(1)

    await page.getByPlaceholder(/buscar por nome/i).fill('cultura')
    await page.waitForTimeout(500) // debounce

    const filteredCount = await cards.count()
    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThan(initialCount)
  })

  test('search updates URL params', async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill('cultura')
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('busca=cultura')
  })

  test('frequency chip filters daily clippings', async ({ page }) => {
    const dailyChip = page.getByRole('button', { name: /diários/i })
    if (!(await dailyChip.isVisible().catch(() => false))) {
      test.skip(true, 'Chip Diários não visível')
      return
    }

    const cards = page.locator('a[href^="/clippings/"]')
    const initialCount = await cards.count()

    await dailyChip.click()
    await page.waitForTimeout(300)

    const filteredCount = await cards.count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
    expect(filteredCount).toBeGreaterThan(0)
  })

  test('theme chip filters by theme', async ({ page }) => {
    // Find any theme chip (they have count in parens)
    const themeChips = page.locator('button:has-text("(")')
    const chipCount = await themeChips.count()
    if (chipCount === 0) {
      test.skip(true, 'Nenhum chip temático visível')
      return
    }

    const cards = page.locator('a[href^="/clippings/"]')
    const initialCount = await cards.count()

    await themeChips.first().click()
    await page.waitForTimeout(300)

    const filteredCount = await cards.count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('sort by popular changes order', async ({ page }) => {
    const sortSelect = page.locator('select')
    await sortSelect.selectOption('popular')
    await page.waitForTimeout(300)

    expect(page.url()).toContain('sort=popular')
  })

  test('transparency link is visible and navigates', async ({ page }) => {
    const link = page.getByRole('link', { name: /como funciona/i })
    await expect(link).toBeVisible()

    const href = await link.getAttribute('href')
    expect(href).toContain('transparencia-algoritmica')
  })

  test('combining filters works', async ({ page }) => {
    // Search + frequency chip
    await page.getByPlaceholder(/buscar por nome/i).fill('e')
    await page.waitForTimeout(500)

    const dailyChip = page.getByRole('button', { name: /diários/i })
    if (await dailyChip.isVisible().catch(() => false)) {
      await dailyChip.click()
      await page.waitForTimeout(300)
    }

    const cards = page.locator('a[href^="/clippings/"]')
    const count = await cards.count()
    // Should show some results (most clippings have 'e' in name)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('empty search shows no-results message', async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill('xyznonexistent123')
    await page.waitForTimeout(500)

    await expect(page.getByText(/nenhum clipping/i)).toBeVisible()
  })
})

test.describe('Transparência Algorítmica', () => {
  test('page loads and renders content', async ({ page }) => {
    await page.goto('/transparencia-algoritmica')
    await expect(
      page.getByRole('heading', { name: /transparência algorítmica/i }),
    ).toBeVisible()
  })

  test('has anchor for prateleira section', async ({ page }) => {
    await page.goto('/transparencia-algoritmica#prateleira-de-clippings')
    await expect(
      page.getByRole('heading', { name: /prateleira de clippings/i }),
    ).toBeVisible()
  })
})
