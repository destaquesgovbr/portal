import { expect, test } from '@playwright/test'

let createdClippingId: string | null = null

test.describe('Clipping — Manual Creation & Edit', () => {
  test('wizard novo não dispara pageerror (regressão GrowthBook race)', async ({
    page,
  }) => {
    // Regressão: páginas autenticadas que usam `useClippingService()` →
    // `useFeatureFlag()` explodiam com "Missing or invalid GrowthBookProvider"
    // durante a janela entre o initial render e o `setGrowthbook(gb)` do
    // `useEffect` async no `GrowthBookProvider` customizado.
    //
    // Esse teste capta qualquer `pageerror` (erro não tratado no
    // navegador) que ocorra na navegação do wizard.
    const pageErrors: Error[] = []
    page.on('pageerror', (err) => {
      pageErrors.push(err)
    })

    await page.goto('/minha-conta/clipping/novo')
    await page.waitForLoadState('networkidle')

    // Aguarda o conteúdo principal do wizard renderizar (qualquer um dos
    // dois modos: assistente IA ou configuração manual).
    await expect(
      page.locator('text=Assistente IA').or(page.locator('#clipping-name')),
    ).toBeVisible({ timeout: 10000 })

    // Garante que nenhum erro do tipo "Missing or invalid GrowthBookProvider"
    // (nem nenhum outro) escapou para o error boundary do Next.js.
    expect(
      pageErrors.map((e) => e.message),
      `pageerror events captured: ${pageErrors.map((e) => e.message).join(', ')}`,
    ).toEqual([])
  })

  test.afterAll(async ({ request }) => {
    // Cleanup: delete the test clipping if created
    // TODO: portar para GraphQL no §9 R1 (RUNBOOK-R1.md) — endpoint REST será removido
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

    // Captura o ID do clipping criado para cleanup no afterAll
    const match = page.url().match(/\/minha-conta\/clipping\/([^/?#]+)/)
    if (match?.[1] && match[1] !== 'novo') {
      createdClippingId = match[1]
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
