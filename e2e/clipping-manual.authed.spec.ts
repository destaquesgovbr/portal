import { expect, test } from '@playwright/test'

const createdClippingId: string | null = null

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

  test('botão Confirmar fica habilitado com apenas Email marcado, sem emails extras', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    // Modo manual
    await page.click('text=Configuração manual')

    // Preenche nome e adiciona keyword
    await page.fill('#clipping-name', 'E2E Email Only')

    const recorteTitle = page.locator('input[placeholder*="Educação Superior"]')
    if (await recorteTitle.isVisible()) {
      await recorteTitle.fill('Recorte Email Only')
    }

    const keywordInput = page.locator('input[placeholder*="palavra-chave"]')
    if (await keywordInput.isVisible()) {
      await keywordInput.fill('e2e email only')
      await keywordInput.press('Enter')
    }

    // Avança: Recortes → Agendamento → Canais
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)

    // Marca apenas o canal Email (sem adicionar nenhum email extra)
    await page.locator('label:has-text("Email")').click()

    // Confirmar deve estar habilitado mesmo sem emails extras
    const confirmBtn = page.locator('button:has-text("Confirmar")')
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 })

    // Cria o clipping
    await confirmBtn.click()

    // Redireciona para a listagem
    await expect(page).toHaveURL(/minha-conta\/clipping/, { timeout: 10000 })
  })

  test('botão Confirmar fica desabilitado quando nenhum canal está selecionado', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    // Modo manual
    await page.click('text=Configuração manual')

    await page.fill('#clipping-name', 'E2E No Channel')

    const recorteTitle = page.locator('input[placeholder*="Educação Superior"]')
    if (await recorteTitle.isVisible()) {
      await recorteTitle.fill('Recorte No Channel')
    }

    const keywordInput = page.locator('input[placeholder*="palavra-chave"]')
    if (await keywordInput.isVisible()) {
      await keywordInput.fill('e2e no channel')
      await keywordInput.press('Enter')
    }

    // Avança até Canais sem marcar nenhum canal
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("ximo")')
    await page.waitForTimeout(500)

    const confirmBtn = page.locator('button:has-text("Confirmar")')
    await expect(confirmBtn).toBeDisabled({ timeout: 5000 })
  })
})
