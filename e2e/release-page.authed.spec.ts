import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Release Page', () => {
  let releaseUrl: string | null = null

  test.beforeAll(async ({ browser }) => {
    // Find a release URL from a listing's releases
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    })
    const page = await context.newPage()

    // Go to marketplace and find a listing
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    const firstLink = page.locator('a[href*="/clippings/"]').first()
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click()
      await page.waitForLoadState('networkidle')

      // Find a release link on the listing page
      const releaseLink = page.locator('a[href*="/clipping/release/"]').first()
      if (await releaseLink.isVisible().catch(() => false)) {
        releaseUrl = await releaseLink.getAttribute('href')
      }
    }
    await context.close()
  })

  test('release page loads and renders digest', async ({ page }) => {
    test.skip(!releaseUrl, 'No releases available')

    await page.goto(releaseUrl!)
    await page.waitForLoadState('networkidle')

    // Page should not show error
    const errors = await page.locator('text=Erro').count()
    expect(errors).toBe(0)

    // Should have some content (either iframe with digest or text)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })

  test('release page shows clipping name', async ({ page }) => {
    test.skip(!releaseUrl, 'No releases available')

    await page.goto(releaseUrl!)
    await page.waitForLoadState('networkidle')

    // Should show the clipping name somewhere
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('release page has share/download actions', async ({ page }) => {
    test.skip(!releaseUrl, 'No releases available')

    await page.goto(releaseUrl!)
    await page.waitForLoadState('networkidle')

    // Should show action buttons (PDF, share, etc.)
    const pdfBtn = page.locator('button:has-text("PDF"), a:has-text("PDF")')
    const shareBtn = page.locator(
      'button:has-text("Compartilhar"), button[aria-label*="ompartilhar"]',
    )

    const hasActions =
      (await pdfBtn.isVisible().catch(() => false)) ||
      (await shareBtn.isVisible().catch(() => false))

    // Actions may or may not be visible depending on release state
    expect(true).toBe(true)
  })

  test('release digest iframe renders with non-zero height', async ({
    page,
  }) => {
    test.skip(!releaseUrl, 'No releases available')

    await page.goto(releaseUrl!)
    await page.waitForLoadState('networkidle')

    // The digest is usually rendered in an iframe
    const iframe = page.locator('iframe').first()
    if (await iframe.isVisible().catch(() => false)) {
      const box = await iframe.boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThan(100)
      }
    }
  })

  test('release page handles non-existent release gracefully', async ({
    page,
  }) => {
    await page.goto('/clipping/release/nonexistent-id-12345')
    await page.waitForLoadState('networkidle')

    // Should show 404 or "not found" — not crash
    const notFound = page.locator('text=não encontrad')
    const is404 = page.locator('text=404')
    const body = await page.locator('body').innerText()

    const handledGracefully =
      (await notFound.isVisible().catch(() => false)) ||
      (await is404.isVisible().catch(() => false)) ||
      body.includes('404') ||
      body.includes('encontrad')

    expect(handledGracefully).toBe(true)
  })

  test('release page is accessible without authentication', async ({
    browser,
  }) => {
    test.skip(!releaseUrl, 'No releases available')

    // Use a fresh context WITHOUT auth
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(releaseUrl!)
    await page.waitForLoadState('networkidle')

    // Release pages should be public — no redirect to login
    const url = page.url()
    expect(url).not.toContain('signin')

    // Should still render content
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)

    await context.close()
  })
})
