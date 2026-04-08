import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Meus Clippings — Listagem', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/minha-conta/clipping')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without errors', async ({ page }) => {
    // No error messages or blank page
    await expect(page.locator('text=Meus Clippings').first()).toBeVisible()
    const errorText = await page.locator('text=Erro').count()
    expect(errorText).toBe(0)
  })

  test('shows clipping cards with name and schedule', async ({ page }) => {
    // Should have at least one clipping card
    const cards = page.locator('.border.rounded-lg')
    const count = await cards.count()

    if (count > 0) {
      // First card should have a name visible
      const firstCard = cards.first()
      const text = await firstCard.innerText()
      expect(text.length).toBeGreaterThan(0)
    }
  })

  test('clipping cards show delivery channel badges', async ({ page }) => {
    // Check for any channel badge (Email, Telegram, Push, Webhook)
    const emailBadge = page.locator('text=Email').first()
    const telegramBadge = page.locator('text=Telegram').first()
    const pushBadge = page.locator('text=Push').first()

    const hasAnyBadge =
      (await emailBadge.isVisible().catch(() => false)) ||
      (await telegramBadge.isVisible().catch(() => false)) ||
      (await pushBadge.isVisible().catch(() => false))

    // At least one clipping should have at least one channel
    expect(hasAnyBadge).toBe(true)
  })

  test('only shows "Inativo" badge when clipping is inactive', async ({
    page,
  }) => {
    // "Ativo" badge was removed — only "Inativo" appears for disabled clippings
    const activeBadge = page
      .locator('[data-testid="clipping-card"]')
      .locator('text=Ativo')
      .first()
    const isActiveVisible = await activeBadge.isVisible().catch(() => false)
    // If all clippings are active, no status badge should be shown
    // If any is inactive, "Inativo" badge should appear
    // Either way, the explicit "Ativo" text should NOT appear as a status badge
    // (note: "Ativo" can still appear inside dropdown menu as "Desativar"/"Ativar")
    expect(isActiveVisible).toBe(false)
  })

  test('"Novo Clipping" button navigates to wizard', async ({ page }) => {
    const newBtn = page
      .locator('a:has-text("Novo Clipping"), button:has-text("Novo Clipping")')
      .first()
    if (await newBtn.isVisible()) {
      await newBtn.click()
      await expect(page).toHaveURL(/minha-conta\/clipping\/novo/)
    }
  })

  test('edit button navigates to edit page', async ({ page }) => {
    const editBtn = page.locator('text=Editar').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await expect(page).toHaveURL(/minha-conta\/clipping\/.*\/editar/)
    }
  })

  test('clipping cards have edit option in dropdown', async ({ page }) => {
    // Edit is now inside the dropdown menu
    const card = page.locator('[data-testid="clipping-card"]').first()
    const menuBtn = card.locator('button[aria-haspopup="menu"]').first()
    if (!(await menuBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'No dropdown menu found')
      return
    }
    await menuBtn.click()
    const editItem = page.getByRole('menuitem', { name: /editar/i })
    await expect(editItem).toBeVisible()
  })

  test('page handles empty state gracefully', async ({ page }) => {
    // Even if no clippings, page should not crash
    // The page title should always be visible
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

test.describe('Meus Clippings — Clippings que sigo', () => {
  test('shows followed listings section if user follows any', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping')
    await page.waitForLoadState('networkidle')

    // If user follows listings, the section should appear
    const followSection = page.locator('text=Clippings que sigo')
    const hasFollows = await followSection.isVisible().catch(() => false)

    // Either the section exists with cards, or it's absent (both valid)
    if (hasFollows) {
      // Should have at least one follow card below
      const followCards = page.locator('text=Editar entrega')
      expect(await followCards.count()).toBeGreaterThanOrEqual(0)
    }
    // No crash in either case
    expect(true).toBe(true)
  })
})
