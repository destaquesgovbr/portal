import { expect, test } from '@playwright/test'

test.describe('Zen Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('toggle button is visible for logged-in users', async ({ page }) => {
    await expect(
      page.locator('button[aria-label="Modo leitura"]').first(),
    ).toBeVisible()
  })

  test('clicking toggle hides header and footer', async ({ page }) => {
    await page.locator('button[aria-label="Modo leitura"]').first().click()
    await page.waitForTimeout(500)

    await expect(page.locator('header')).toHaveCSS('opacity', '0')
    await expect(page.locator('footer')).toHaveCSS('opacity', '0')
  })

  test('FAB appears in zen mode and exits on click', async ({ page }) => {
    await page.locator('button[aria-label="Modo leitura"]').first().click()
    await page.waitForTimeout(500)

    const fab = page.locator('button[aria-label="Sair do modo leitura"]')
    await expect(fab).toBeVisible()

    await fab.click()
    await page.waitForTimeout(500)

    await expect(page.locator('header')).toHaveCSS('opacity', '1')
  })

  test('Alt+Z keyboard shortcut toggles zen mode', async ({ page }) => {
    await page.keyboard.press('Alt+z')
    await page.waitForTimeout(500)
    await expect(page.locator('header')).toHaveCSS('opacity', '0')

    await page.keyboard.press('Alt+z')
    await page.waitForTimeout(500)
    await expect(page.locator('header')).toHaveCSS('opacity', '1')
  })

  test('zen mode persists across page navigation', async ({ page }) => {
    await page.locator('button[aria-label="Modo leitura"]').first().click()
    await page.waitForTimeout(500)

    await page.goto('/artigos')
    await page.waitForLoadState('networkidle')

    // Should still be in zen mode (persisted in localStorage)
    const isZen = await page.evaluate(() =>
      document.body.classList.contains('zen-mode'),
    )
    expect(isZen).toBe(true)
  })
})
