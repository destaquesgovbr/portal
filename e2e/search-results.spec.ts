import { expect, test } from '@playwright/test'

test('search results page loads without error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/busca?q=saude', { waitUntil: 'networkidle' })

  const errorEl = page.getByText('Ocorreu um erro ao carregar os resultados.')
  const hasError = await errorEl.isVisible()

  if (hasError) {
    console.log('Page errors:', errors)
    // Print the full page content for debugging
    console.log('Page content:', await page.content())
  }

  await expect(errorEl).not.toBeVisible()
})

test('semantic toggle is visible and toggles', async ({ page }) => {
  await page.goto('/busca?q=saude', { waitUntil: 'networkidle' })

  const toggle = page.getByRole('button', { name: /busca inteligente/i })
  await expect(toggle).toBeVisible()

  // Click to disable
  await toggle.click()
  await expect(page).toHaveURL(/semantica=0/)
})

test('search works without semantic (semantica=0)', async ({ page }) => {
  await page.goto('/busca?q=saude&semantica=0', { waitUntil: 'networkidle' })

  await expect(
    page.getByText('Ocorreu um erro ao carregar os resultados.'),
  ).not.toBeVisible()

  // Toggle should appear inactive
  const toggle = page.getByRole('button', { name: /busca inteligente/i })
  await expect(toggle).toBeVisible()
})

test('search shows results cards (semantic off)', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/busca?q=saude&semantica=0')

  await expect(
    page.getByText('Ocorreu um erro ao carregar os resultados.'),
  ).not.toBeVisible({ timeout: 15000 })

  // NewsCard renders as <a> links — wait for React Query to hydrate and render cards
  const cards = page.locator('main a[href^="/artigos/"]')
  await expect(cards.first()).toBeVisible({ timeout: 15000 })

  if (consoleErrors.length) console.log('Console errors:', consoleErrors)
})

test('search shows results cards (semantic on)', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/busca?q=saude')

  await expect(
    page.getByText('Ocorreu um erro ao carregar os resultados.'),
  ).not.toBeVisible({ timeout: 30000 })

  const cards = page.locator('main a[href^="/artigos/"]')
  await expect(cards.first()).toBeVisible({ timeout: 30000 })

  if (consoleErrors.length) console.log('Console errors:', consoleErrors)
})
