import { expect, test } from '@playwright/test'

test.describe('Integração page', () => {
  test('should load with hero and all 3 sections', async ({ page }) => {
    await page.goto('/integracao', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('heading', { name: /integrações programáticas/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /api graphql/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /servidor mcp/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /chat conversacional/i }),
    ).toBeVisible()
  })

  test('back link should return home', async ({ page }) => {
    await page.goto('/integracao', { waitUntil: 'domcontentloaded' })
    const backLink = page
      .getByRole('link', { name: /voltar para a home/i })
      .first()
    await expect(backLink).toBeVisible()
    await backLink.click()
    await expect(page).toHaveURL('/')
  })
})
