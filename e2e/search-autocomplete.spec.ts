import { expect, test } from '@playwright/test'

test.describe('Search Autocomplete', () => {
  test.beforeEach(async ({ page, viewport }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // On mobile, we need to click the search button to reveal the search bar
    const isMobile = viewport && viewport.width < 768
    if (isMobile) {
      const searchButton = page.locator(
        'button[aria-label="Search"], button:has(svg.lucide-search)',
      )
      await searchButton.first().click()
      // Wait a bit for the overlay to appear
      await page.waitForTimeout(200)
    }
  })

  test('should not show suggestions with less than 2 characters', async ({
    page,
  }) => {
    // Use .last() to get the visible input (mobile overlay or desktop)
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await searchInput.fill('a')

    // Dropdown should not be visible (no need to wait)
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).not.toBeVisible()
  })

  test('should show suggestions after typing 2+ characters', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await searchInput.fill('min')

    // Wait for debounce and API response (reduced timeout)
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Should have suggestion items
    const suggestions = page.locator('[role="option"]')
    await expect(suggestions.first()).toBeVisible()
  })

  test('should navigate suggestions with keyboard', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await searchInput.fill('gov')

    // Wait for suggestions
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Press ArrowDown to select first item
    await searchInput.press('ArrowDown')

    // First option should be selected (aria-selected="true")
    const firstOption = page.locator('[role="option"]').first()
    await expect(firstOption).toHaveAttribute('aria-selected', 'true')

    // Press ArrowDown again to select second item (if exists)
    const optionsCount = await page.locator('[role="option"]').count()
    if (optionsCount > 1) {
      await searchInput.press('ArrowDown')
      const secondOption = page.locator('[role="option"]').nth(1)
      await expect(secondOption).toHaveAttribute('aria-selected', 'true')
      await expect(firstOption).toHaveAttribute('aria-selected', 'false')
    }

    // Press ArrowUp to go back
    await searchInput.press('ArrowUp')
    await expect(firstOption).toHaveAttribute('aria-selected', 'true')
  })

  test('should close dropdown on Escape and navigate on click/Enter', async ({
    page,
    viewport,
  }) => {
    const isMobile = viewport && viewport.width < 768
    let searchInput = page.locator('input[placeholder*="Buscar"]').last()
    const dropdown = page.locator('[role="listbox"]')

    // Test Escape key
    await searchInput.fill('bra')
    await expect(dropdown).toBeVisible()
    await searchInput.press('Escape')
    await expect(dropdown).not.toBeVisible()

    // On mobile, escape closes the overlay, so we need to re-open it
    if (isMobile) {
      const searchButton = page.locator(
        'button[aria-label="Search"], button:has(svg.lucide-search)',
      )
      await searchButton.first().click()
      await page.waitForTimeout(200)
      searchInput = page.locator('input[placeholder*="Buscar"]').last()
    }

    // Test clicking suggestion
    await searchInput.fill('min')
    await expect(dropdown).toBeVisible()
    await page.locator('[role="option"]').first().click()
    await expect(page).toHaveURL(/\/artigos\//)

    // Go back and test Enter key
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Re-open mobile search if needed
    if (isMobile) {
      const searchButton = page.locator(
        'button[aria-label="Search"], button:has(svg.lucide-search)',
      )
      await searchButton.first().click()
      await page.waitForTimeout(200)
    }

    const searchInputAfterNav = page
      .locator('input[placeholder*="Buscar"]')
      .last()
    await searchInputAfterNav.fill('gov')
    await expect(dropdown).toBeVisible()
    await searchInputAfterNav.press('ArrowDown')
    await searchInputAfterNav.press('Enter')
    await expect(page).toHaveURL(/\/artigos\//)
  })

  test('should go to search page when pressing Enter without selection', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    await searchInput.fill('teste busca')

    // Press Enter without selecting any suggestion
    await searchInput.press('Enter')

    // Should navigate to search page with query (accept both %20 and + encoding)
    await expect(page).toHaveURL(/\/busca\?q=teste(\+|%20)busca/)
  })

  test('should handle clear button', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()
    const dropdown = page.locator('[role="listbox"]')

    await searchInput.fill('min')
    await expect(dropdown).toBeVisible()

    // Test clear button - use .last() to get the visible one
    const clearButton = page.locator('[aria-label="Limpar busca"]').last()
    await clearButton.click()
    await expect(searchInput).toHaveValue('')
    await expect(dropdown).not.toBeVisible()
  })

  test('should find results ignoring accents (diacritics)', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()

    // Search without accent - should find "Ministério"
    await searchInput.fill('ministerio')

    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Should have at least one suggestion
    const suggestions = page.locator('[role="option"]')
    const count = await suggestions.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have proper ARIA attributes for accessibility', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]').last()

    // Check combobox role
    await expect(searchInput).toHaveAttribute('role', 'combobox')
    await expect(searchInput).toHaveAttribute('aria-autocomplete', 'both')
    await expect(searchInput).toHaveAttribute('aria-expanded', 'false')

    // Type to show suggestions
    await searchInput.fill('gov')
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // aria-expanded should be true now
    await expect(searchInput).toHaveAttribute('aria-expanded', 'true')

    // Dropdown and options should have proper roles
    await expect(dropdown).toHaveAttribute('role', 'listbox')
    const firstOption = page.locator('[role="option"]').first()
    await expect(firstOption).toHaveAttribute('role', 'option')
  })
})
