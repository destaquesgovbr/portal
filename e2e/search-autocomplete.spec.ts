import { expect, test } from '@playwright/test'

test.describe('Search Autocomplete', () => {
  // Helper compartilhado: em mobile, o input de busca fica atrás de um botão
  // que abre o overlay. O botão é client-side (`setSearchOpen(true)`), então
  // só funciona depois da hidratação. Aguardamos o input visível para evitar
  // flakes onde o overlay ainda não foi renderizado.
  async function openMobileSearchIfNeeded(
    page: import('@playwright/test').Page,
    viewport: { width: number; height: number } | null,
  ) {
    const isMobile = viewport && viewport.width < 768
    if (!isMobile) return

    const visibleInput = page.locator('input[placeholder*="Buscar"]:visible')
    if (
      await visibleInput
        .first()
        .isVisible()
        .catch(() => false)
    )
      return

    // Aguarda a hidratação client-side concluir: o onClick do botão de
    // busca mobile só é registrado depois que o bundle JS carrega. Em
    // cold-start de Cloud Run isso pode tomar 5-10s.
    await page
      .waitForLoadState('networkidle', { timeout: 30_000 })
      .catch(() => {})

    const searchButton = page.locator(
      'button[aria-label="Search"]:visible, button:has(svg.lucide-search):visible',
    )

    // Tentamos clicar até 5 vezes até o overlay abrir (cold start mobile
    // de staging às vezes precisa de mais retries que desktop).
    for (let attempt = 0; attempt < 5; attempt++) {
      await searchButton
        .first()
        .click({ timeout: 5_000 })
        .catch(() => {})
      const opened = await visibleInput
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
      if (opened) return
    }

    // Falha explícita com mensagem clara se nada abriu.
    await expect(visibleInput.first()).toBeVisible({ timeout: 5_000 })
  }

  /**
   * Verifica se o ambiente alvo (staging/prod) tem ao menos um artigo
   * indexado no Typesense. Em staging o índice pode estar vazio se a
   * pipeline de ingestão ainda não rodou — nesse caso o autocomplete
   * nunca exibirá sugestões e os testes que dependem disso são
   * skipped em vez de falsos negativos.
   */
  async function hasSearchData(
    page: import('@playwright/test').Page,
  ): Promise<boolean> {
    try {
      const res = await page.request.get('/busca?q=governo', {
        timeout: 15_000,
      })
      const body = await res.text()
      return body.includes('/artigos/')
    } catch {
      return false
    }
  }

  test.beforeEach(async ({ page, viewport }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await openMobileSearchIfNeeded(page, viewport)
  })

  test('should not show suggestions with less than 2 characters', async ({
    page,
  }) => {
    // Use .last() to get the visible input (mobile overlay or desktop)
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
    await searchInput.fill('a')

    // Dropdown should not be visible (no need to wait)
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).not.toBeVisible()
  })

  test('should show suggestions after typing 2+ characters', async ({
    page,
  }) => {
    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
    await searchInput.fill('min')

    // Wait for debounce and API response (reduced timeout)
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Should have suggestion items
    const suggestions = page.locator('[role="option"]')
    await expect(suggestions.first()).toBeVisible()
  })

  test('should navigate suggestions with keyboard', async ({ page }) => {
    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
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
    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )
    let searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
    const dropdown = page.locator('[role="listbox"]')

    // Test Escape key
    await searchInput.fill('bra')
    await expect(dropdown).toBeVisible()
    await searchInput.press('Escape')
    await expect(dropdown).not.toBeVisible()

    // On mobile, escape closes the overlay, so we need to re-open it
    await openMobileSearchIfNeeded(page, viewport)
    searchInput = page.locator('input[placeholder*="Buscar"]:visible').last()

    // Test clicking suggestion
    await searchInput.fill('min')
    await expect(dropdown).toBeVisible()
    await page.locator('[role="option"]').first().click()
    await expect(page).toHaveURL(/\/artigos\//)

    // Go back and test Enter key
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await openMobileSearchIfNeeded(page, viewport)

    const searchInputAfterNav = page
      .locator('input[placeholder*="Buscar"]:visible')
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
    // Garante que o JS está hidratado antes de interagir.
    await page
      .waitForLoadState('networkidle', { timeout: 30_000 })
      .catch(() => {})
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    await searchInput.focus()
    await searchInput.fill('teste busca')

    // Press Enter without selecting any suggestion
    await searchInput.press('Enter')

    // Should navigate to search page with query (accept both %20 and + encoding)
    await expect(page).toHaveURL(/\/busca\?q=teste(\+|%20)busca/, {
      timeout: 15_000,
    })
  })

  test('should handle clear button', async ({ page }) => {
    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()
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
    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()

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
    const searchInput = page
      .locator('input[placeholder*="Buscar"]:visible')
      .last()

    // Check combobox role
    await expect(searchInput).toHaveAttribute('role', 'combobox')
    await expect(searchInput).toHaveAttribute('aria-autocomplete', 'both')
    await expect(searchInput).toHaveAttribute('aria-expanded', 'false')

    test.skip(
      !(await hasSearchData(page)),
      'Typesense do ambiente alvo sem dados — sem sugestões para validar',
    )

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
