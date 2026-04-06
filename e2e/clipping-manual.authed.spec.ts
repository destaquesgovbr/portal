import { expect, test } from '@playwright/test'

let createdClippingId: string | null = null

test.describe('Clipping — Manual Creation & Edit', () => {
  test.afterAll(async ({ request }) => {
    // Cleanup: delete the test clipping if created
    if (createdClippingId) {
      await request.delete(`/api/clipping/${createdClippingId}`)
    }
  })

  test('wizard shows agent mode by default for new clippings', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Assistente IA')).toBeVisible()
    await expect(page.locator('#agent-prompt')).toBeVisible()
  })

  test('can switch to manual mode', async ({ page }) => {
    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    await page.click('text=Configuração manual')

    await expect(page.locator('#clipping-name')).toBeVisible()
    await expect(page.locator('text=Adicionar Recorte')).toBeVisible()
  })

  test('creates clipping with manual recorte', async ({ page }) => {
    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    // Switch to manual
    await page.click('text=Configuração manual')

    // Fill name
    await page.fill('#clipping-name', 'E2E Test Clipping')

    // Add a keyword to the first recorte
    const recorteTitle = page.locator('input[placeholder*="Educação Superior"]')
    if (await recorteTitle.isVisible()) {
      await recorteTitle.fill('Recorte E2E')
    }

    // Type keyword and press Enter
    const keywordInput = page.locator('input[placeholder*="palavra-chave"]')
    if (await keywordInput.isVisible()) {
      await keywordInput.fill('teste e2e')
      await keywordInput.press('Enter')
    }

    // Next → Agendamento
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)

    // Next → Canais
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)

    // Enable email
    const emailLabel = page.locator('label:has-text("Email")')
    if (await emailLabel.isVisible()) {
      await emailLabel.click()
    }

    // Confirm
    await page.click('button:has-text("Confirmar")')

    // Should redirect to listing
    await expect(page).toHaveURL(/minha-conta\/clipping/, { timeout: 10000 })

    // Extract clipping ID for cleanup
    const response = await page.request.get('/api/clipping')
    const clippings = await response.json()
    const testClipping = clippings.find(
      (c: { name: string }) => c.name === 'E2E Test Clipping',
    )
    if (testClipping) {
      createdClippingId = testClipping.id
    }
  })

  test('meus clippings page shows created clippings', async ({ page }) => {
    await page.goto('/minha-conta/clipping')
    await page.waitForLoadState('networkidle')

    // Should have at least one clipping card
    await expect(
      page
        .locator('[data-testid="clipping-card"]')
        .or(page.locator('.border.rounded-lg').first()),
    ).toBeVisible({ timeout: 10000 })
  })
})
