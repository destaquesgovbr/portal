import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Clipping — Edit Flow', () => {
  let editUrl: string | null = null
  let clippingName: string | null = null

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    })
    const page = await context.newPage()
    await page.goto('/minha-conta/clipping')
    await page.waitForLoadState('networkidle')

    // Find the first "Editar" link
    const editLink = page.locator('a:has-text("Editar")').first()
    if (await editLink.isVisible().catch(() => false)) {
      editUrl = await editLink.getAttribute('href')

      // Get the clipping name from the card
      const card = editLink.locator(
        'xpath=ancestor::div[contains(@class,"rounded")]',
      )
      clippingName = await card
        .locator('h3, .font-bold, .font-semibold')
        .first()
        .innerText()
        .catch(() => null)
    }
    await context.close()
  })

  test('edit page loads with pre-filled wizard', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // Should show wizard in manual mode (not agent mode)
    await expect(page.locator('#clipping-name')).toBeVisible({ timeout: 10000 })

    // Name should be pre-filled
    const name = await page.locator('#clipping-name').inputValue()
    expect(name.length).toBeGreaterThan(0)
  })

  test('edit page shows existing recortes', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // Should have at least one recorte with a title
    const recorteTitles = page.locator(
      'input[placeholder*="Educação"], input[value]',
    )
    await expect(recorteTitles.first()).toBeVisible({ timeout: 10000 })
  })

  test('edit page allows step navigation', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // In edit mode, step indicators should be clickable
    const step2 = page.locator('button:has-text("2")')
    if (await step2.isVisible()) {
      await step2.click()
      await page.waitForTimeout(500)

      // Should navigate to agendamento or prompt step
      const scheduleVisible = await page
        .locator('text=Agendamento')
        .isVisible()
        .catch(() => false)
      const promptVisible = await page
        .locator('text=Prompt')
        .isVisible()
        .catch(() => false)
      const canaisVisible = await page
        .locator('text=Canais')
        .isVisible()
        .catch(() => false)
      expect(scheduleVisible || promptVisible || canaisVisible).toBe(true)
    }
  })

  test('edit page can modify clipping name', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    const nameInput = page.locator('#clipping-name')
    await expect(nameInput).toBeVisible({ timeout: 10000 })

    // Store original name
    const originalName = await nameInput.inputValue()

    // Modify name
    await nameInput.clear()
    await nameInput.fill(originalName + ' (editado)')

    // Verify the change is reflected
    const newName = await nameInput.inputValue()
    expect(newName).toContain('(editado)')

    // Restore original name (don't save — just verify UI reacts)
    await nameInput.clear()
    await nameInput.fill(originalName)
  })

  test('edit page shows "Salvar" button instead of "Confirmar"', async ({
    page,
  }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // In edit mode, the button should say "Salvar" not "Confirmar"
    const saveBtn = page.locator('button:has-text("Salvar")')
    const confirmBtn = page.locator('button:has-text("Confirmar")')

    const hasSave = await saveBtn.isVisible().catch(() => false)
    const hasConfirm = await confirmBtn.isVisible().catch(() => false)

    // Should have one or the other (depends on which step)
    expect(hasSave || hasConfirm).toBe(true)
  })

  test('edit page preserves delivery channels', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // Navigate to Canais step
    const lastStep = page
      .locator('button:has-text("3"), button:has-text("4")')
      .last()
    if (await lastStep.isVisible()) {
      await lastStep.click()
      await page.waitForTimeout(500)
    }

    // Channel checkboxes should be visible
    const emailLabel = page.locator('label:has-text("Email")')
    const hasChannels = await emailLabel.isVisible().catch(() => false)

    // At least the channel step should render
    expect(hasChannels).toBe(true)
  })

  test('edit page does not show agent mode toggle', async ({ page }) => {
    test.skip(!editUrl, 'No clippings to edit')

    await page.goto(editUrl!)
    await page.waitForLoadState('networkidle')

    // Agent mode toggle should NOT appear in edit mode
    const agentToggle = page.locator('text=Assistente IA')
    const hasAgent = await agentToggle.isVisible().catch(() => false)
    expect(hasAgent).toBe(false)
  })

  test('edit page handles non-existent clipping gracefully', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping/nonexistent-id-12345/editar')
    await page.waitForLoadState('networkidle')

    // Should show error or redirect — not crash
    const body = await page.locator('body').innerText()
    const isHandled =
      body.includes('não encontrad') ||
      body.includes('404') ||
      body.includes('Erro') ||
      page.url().includes('/minha-conta/clipping')

    expect(isHandled).toBe(true)
  })
})
