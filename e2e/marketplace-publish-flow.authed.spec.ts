import { expect, test } from '@playwright/test'

test.describe('Marketplace — Fluxo completo de publicação', () => {
  test('publica clipping, verifica no marketplace e despublica', async ({
    page,
  }) => {
    // 1. Go to clippings list
    await page.goto('/minha-conta/clipping')
    await expect(
      page.getByRole('heading', { name: 'Meus Clippings' }).first(),
    ).toBeVisible()

    const cards = page.locator('[data-testid="clipping-card"]')
    const count = await cards.count()
    test.skip(count === 0, 'Nenhum clipping existente')

    // Find a card that has "Publicar no Marketplace" (not already published)
    let publishableCard = null
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const menuBtn = card.locator('button[aria-haspopup="menu"]').first()
      if (!(await menuBtn.isVisible())) continue
      await menuBtn.click()

      const publishOption = page.getByRole('menuitem', {
        name: /publicar no marketplace/i,
      })
      if (await publishOption.isVisible()) {
        publishableCard = card
        break
      }
      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape')
    }

    if (!publishableCard) {
      test.skip(true, 'Nenhum clipping publicável')
      return
    }

    // 2. Click "Publicar no Marketplace"
    await page
      .getByRole('menuitem', { name: /publicar no marketplace/i })
      .click()

    // 3. Dialog opens
    await expect(
      page.getByRole('heading', { name: /publicar no marketplace/i }),
    ).toBeVisible()

    // 4. Fill description
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await textarea.fill('Clipping de teste para o marketplace via E2E')

    // 5. Click Publicar
    const publishBtn = page.getByRole('button', { name: /^publicar$/i })
    await expect(publishBtn).toBeEnabled()
    await publishBtn.click()

    // 6. Wait for success (toast or dialog closes)
    // If error occurs, the dialog stays open and shows a toast
    await expect(
      page.getByRole('heading', { name: /publicar no marketplace/i }),
    ).not.toBeVisible({ timeout: 10000 })

    // 7. Verify clipping now shows "Publicado" badge
    await page.waitForTimeout(500)
    await page.reload()
    await expect(page.getByText('Publicado').first()).toBeVisible({
      timeout: 5000,
    })

    // 8. Go to marketplace and verify listing appears
    await page.goto('/marketplace')
    await expect(page.locator('a[href^="/clippings/"]')).toBeVisible({
      timeout: 5000,
    })

    // 9. Click listing and verify detail page
    await page.locator('a[href^="/clippings/"]').first().click()
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText(/clipping de teste/i)).toBeVisible()

    // 10. Go back and unpublish
    await page.goto('/minha-conta/clipping')
    const publishedCard = page
      .locator('[data-testid="clipping-card"]')
      .filter({ hasText: 'Publicado' })
      .first()
    const menu = publishedCard.locator('button[aria-haspopup="menu"]')
    await menu.click()
    await page.getByRole('menuitem', { name: /despublicar/i }).click()

    // Confirm unpublish (2-step)
    await page.getByRole('menuitem', { name: /confirmar/i }).click()

    // Wait and verify badge removed
    await page.waitForTimeout(1000)
    await page.reload()
    await expect(publishedCard.getByText('Publicado')).not.toBeVisible()
  })
})
