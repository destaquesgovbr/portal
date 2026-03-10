import { expect, test } from '@playwright/test'

const hasKeycloak = !!process.env.AUTH_GOVBR_ISSUER

test.describe('Auth Keycloak SSO', () => {
  test('botão Entrar redireciona para tela de login do Keycloak', async ({
    page,
  }) => {
    test.skip(
      !hasKeycloak,
      'AUTH_GOVBR_ISSUER não configurado — teste requer Keycloak',
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loginBtn = page.getByRole('button', { name: /entrar/i }).first()
    await expect(loginBtn).toBeVisible()

    await loginBtn.click()

    await page.waitForURL(/keycloak/, { timeout: 15000 })
    expect(page.url()).toContain('keycloak')
    expect(page.url()).toContain('destaquesgovbr')

    await page.screenshot({ path: 'test-results/keycloak-login.png' })

    await expect(page.getByText(/gov\.br/i).first()).toBeVisible()
    await expect(page.getByText(/google/i).first()).toBeVisible()
  })

  test('providers endpoint retorna govbr', async ({ page }) => {
    test.skip(!hasKeycloak, 'AUTH_GOVBR_ISSUER não configurado')

    const res = await page.request.get('/api/auth/providers')
    expect(res.status()).toBe(200)
    const providers = await res.json()
    expect(Object.keys(providers)).toContain('govbr')
  })
})
