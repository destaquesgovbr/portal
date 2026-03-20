import { expect, test as setup } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate via dev-login', async ({ page }) => {
  // Go to signin page
  await page.goto('/api/auth/signin')

  // Fill in the dev-login form
  const emailInput = page.locator('input[name="email"]')
  await expect(emailInput).toBeVisible({ timeout: 10000 })
  await emailInput.fill('nitaibezerra@gmail.com')

  // Submit the form
  await page.locator('button[type="submit"]').click()

  // Wait for redirect back to the app (session created)
  await page.waitForURL('/', { timeout: 15000 })

  // Verify we're logged in
  await expect(page.locator('[title="Meus Clippings"]').first()).toBeVisible({
    timeout: 10000,
  })

  // Save auth state
  await page.context().storageState({ path: authFile })
})
