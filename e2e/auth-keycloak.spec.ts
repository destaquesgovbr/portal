import { test, expect } from '@playwright/test'

test.describe('Auth Keycloak SSO', () => {
  test('botão Entrar redireciona para tela de login do Keycloak', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loginBtn = page.getByRole('button', { name: /entrar/i }).first()
    await expect(loginBtn).toBeVisible()

    await loginBtn.click()

    // Espera chegar ao Keycloak
    await page.waitForURL(/keycloak/, { timeout: 15000 })
    expect(page.url()).toContain('keycloak')
    expect(page.url()).toContain('destaquesgovbr')

    await page.screenshot({ path: 'test-results/keycloak-login.png' })

    // Verifica que a tela de login do Keycloak tem os botões de IdP
    await expect(page.getByText(/gov\.br/i).first()).toBeVisible()
    await expect(page.getByText(/google/i).first()).toBeVisible()
  })

  test('providers endpoint retorna govbr', async ({ page }) => {
    const res = await page.request.get('/api/auth/providers')
    expect(res.status()).toBe(200)
    const providers = await res.json()
    expect(Object.keys(providers)).toContain('govbr')
  })
})
