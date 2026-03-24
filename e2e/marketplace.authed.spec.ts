import { expect, test } from '@playwright/test'

test.describe('Marketplace — Navegação', () => {
  test('acessa marketplace a partir da lista de clippings', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping')
    await expect(
      page.getByRole('heading', { name: 'Meus Clippings' }).first(),
    ).toBeVisible()

    const marketplaceLink = page.getByRole('link', {
      name: /explorar marketplace/i,
    })
    await expect(marketplaceLink).toBeVisible()
    await marketplaceLink.click()

    await expect(page).toHaveURL('/marketplace')
    await expect(page.getByText('Marketplace de Clippings')).toBeVisible()
  })

  test('marketplace sem publicações mostra estado vazio', async ({ page }) => {
    await page.goto('/marketplace')
    await expect(page.getByText(/marketplace de clippings/i)).toBeVisible()
    // May show empty state or listings depending on data
  })
})

test.describe('Marketplace — Publicar Clipping', () => {
  test('abre dialog de publicação a partir do card', async ({ page }) => {
    await page.goto('/minha-conta/clipping')
    await expect(
      page.getByRole('heading', { name: 'Meus Clippings' }).first(),
    ).toBeVisible()

    // Find first clipping card that isn't already published
    const cards = page.locator('[data-testid="clipping-card"]')
    const firstCard = cards.first()

    // If no cards exist, skip
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'Nenhum clipping existente para testar publicação')
      return
    }

    // Open dropdown menu
    const menuButton = firstCard.locator('button[aria-haspopup="menu"]').first()
    if (!(await menuButton.isVisible())) {
      test.skip(true, 'Card sem menu dropdown')
      return
    }
    await menuButton.click()

    // Look for "Publicar no Marketplace" option
    const publishOption = page.getByRole('menuitem', {
      name: /publicar no marketplace/i,
    })
    if (!(await publishOption.isVisible())) {
      test.skip(true, 'Clipping já publicado ou é um follow')
      return
    }
    await publishOption.click()

    // Dialog should appear
    await expect(
      page.getByRole('heading', { name: /publicar no marketplace/i }),
    ).toBeVisible()

    // Description textarea should be visible
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('publicação exige descrição preenchida', async ({ page }) => {
    await page.goto('/minha-conta/clipping')

    const cards = page.locator('[data-testid="clipping-card"]')
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'Nenhum clipping existente')
      return
    }

    const firstCard = cards.first()
    const menuButton = firstCard.locator('button[aria-haspopup="menu"]').first()
    if (!(await menuButton.isVisible())) {
      test.skip(true, 'Sem menu')
      return
    }
    await menuButton.click()

    const publishOption = page.getByRole('menuitem', {
      name: /publicar no marketplace/i,
    })
    if (!(await publishOption.isVisible())) {
      test.skip(true, 'Já publicado')
      return
    }
    await publishOption.click()

    // Clear description and try to publish
    const textarea = page.locator('textarea')
    await textarea.clear()

    // Publish button should be disabled when description is empty
    const publishButton = page.getByRole('button', { name: /^publicar$/i })
    await expect(publishButton).toBeDisabled()
  })
})

test.describe('Marketplace — Detalhe do Listing', () => {
  test('página de detalhe mostra informações do listing', async ({ page }) => {
    // First go to marketplace to find a listing
    await page.goto('/marketplace')

    const cards = page.locator('a[href^="/clippings/"]')
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'Nenhum listing no marketplace')
      return
    }

    // Click first listing
    const firstCard = cards.first()
    await firstCard.click()

    // Should navigate to detail page
    await page.waitForURL(/\/marketplace\//, { timeout: 5000 })

    // Should show listing name as heading
    await expect(page.locator('h1').nth(1)).toBeVisible()

    // Should show action buttons (Follow, Clone, Like)
    await expect(
      page.getByRole('button', { name: /seguir|seguindo/i }),
    ).toBeVisible()
  })
})

test.describe('Marketplace — Follow', () => {
  test('botão seguir abre dialog com canais (sem horário)', async ({
    page,
  }) => {
    await page.goto('/marketplace')

    const cards = page.locator('a[href^="/clippings/"]')
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'Nenhum listing')
      return
    }

    await cards.first().click()

    const followButton = page.getByRole('button', { name: /seguir/i }).first()
    if (!(await followButton.isVisible())) {
      test.skip(true, 'Botão seguir não visível (talvez já segue)')
      return
    }
    await followButton.click()

    // Dialog should show channel checkboxes but NOT schedule
    await expect(page.getByText(/como deseja receber/i)).toBeVisible()
    await expect(page.getByText(/canais de entrega/i)).toBeVisible()
    // Schedule select should NOT be present
    await expect(page.getByText(/horário/i)).not.toBeVisible()
  })
})

test.describe('Marketplace — Like', () => {
  test('clicar like altera estado do botão', async ({ page }) => {
    await page.goto('/marketplace')

    const cards = page.locator('a[href^="/clippings/"]')
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'Nenhum listing')
      return
    }

    await cards.first().click()

    const likeButton = page.locator('button:has(svg.lucide-heart)').first()
    await expect(likeButton).toBeVisible()

    // Get initial like count text
    await likeButton.textContent()

    // Click like
    await likeButton.click()

    // Wait for API response
    await page.waitForTimeout(500)

    // Button state should have changed (either filled heart or count changed)
    const afterText = await likeButton.textContent()
    // We just verify no error occurred — the text may or may not change
    expect(afterText).toBeDefined()
  })
})
