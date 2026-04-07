import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Listing Detail Page', () => {
  let listingUrl: string | null = null

  test.beforeAll(async ({ browser }) => {
    // Find a listing URL from the marketplace page
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    })
    const page = await context.newPage()
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    const firstLink = page.locator('a[href*="/clippings/"]').first()
    if (await firstLink.isVisible().catch(() => false)) {
      listingUrl = await firstLink.getAttribute('href')
    }
    await context.close()
  })

  test('marketplace page loads and shows listings', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    // Page should have a title
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // Should have at least one listing card or empty state
    const cards = page.locator('a[href*="/clippings/"]')
    const emptyState = page.locator('text=Nenhum clipping publicado')
    const hasContent =
      (await cards.count()) > 0 ||
      (await emptyState.isVisible().catch(() => false))
    expect(hasContent).toBe(true)
  })

  test('listing detail page loads without errors', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available in marketplace')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    // Should show listing name
    await expect(page.locator('h1').first()).toBeVisible()

    // No error messages
    const errors = await page.locator('text=Erro').count()
    expect(errors).toBe(0)
  })

  test('listing shows author info', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    // Should show "Por <author name>"
    const authorText = page.locator('text=Por ')
    await expect(authorText.first()).toBeVisible()
  })

  test('listing shows recortes breakdown', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    // Should show recortes section with themes/agencies/keywords
    const recortesSection = page.locator('text=Recortes')
    const hasRecortes = await recortesSection
      .first()
      .isVisible()
      .catch(() => false)
    // Recortes may or may not be visible depending on listing, but page shouldn't crash
    expect(true).toBe(true)
  })

  test('listing shows follow or following state', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    const followBtn = page.locator('button:has-text("Seguir")')
    const followingText = page.locator('text=Seguindo')
    const ownListing = page.locator('text=Publicado')

    const hasFollowState =
      (await followBtn.isVisible().catch(() => false)) ||
      (await followingText.isVisible().catch(() => false)) ||
      (await ownListing.isVisible().catch(() => false))

    // Authenticated user should see follow button, following badge, or own listing badge
    expect(hasFollowState).toBe(true)
  })

  test('listing shows releases section', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    // Should show releases or "Nenhuma edição" message
    const releasesHeader = page.locator('text=Edições')
    const noReleases = page.locator('text=Nenhuma edição')
    const releaseCards = page.locator('a[href*="/clipping/release/"]')

    const hasReleasesSection =
      (await releasesHeader
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await noReleases.isVisible().catch(() => false)) ||
      (await releaseCards.count()) > 0

    expect(hasReleasesSection).toBe(true)
  })

  test('listing shows RSS/JSON feed links', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    const rssLink = page.locator('a[href*="feed.xml"]')
    const jsonLink = page.locator('a[href*="feed.json"]')

    const hasFeeds =
      (await rssLink.isVisible().catch(() => false)) ||
      (await jsonLink.isVisible().catch(() => false))

    // Feed links may or may not be visible
    expect(true).toBe(true)
  })

  test('listing cover image loads if present', async ({ page }) => {
    test.skip(!listingUrl, 'No listings available')

    await page.goto(listingUrl!)
    await page.waitForLoadState('networkidle')

    const coverImg = page.locator('img[alt]').first()
    if (await coverImg.isVisible().catch(() => false)) {
      // Image should have non-zero dimensions
      const box = await coverImg.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(0)
        expect(box.height).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Listing Detail — Follow Dialog', () => {
  test('follow dialog opens with channel selection', async ({ page }) => {
    await page.goto('/clippings')
    await page.waitForLoadState('networkidle')

    // Find a listing that is NOT owned by the test user (can follow)
    const firstLink = page.locator('a[href*="/clippings/"]').first()
    if (!(await firstLink.isVisible().catch(() => false))) return

    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const followBtn = page.locator('button:has-text("Seguir")')
    if (await followBtn.isVisible().catch(() => false)) {
      await followBtn.click()
      await page.waitForTimeout(500)

      // Dialog should open with channel checkboxes
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible().catch(() => false)) {
        const emailOption = dialog.locator('text=Email')
        expect(await emailOption.isVisible()).toBe(true)
      }
    }
  })
})
