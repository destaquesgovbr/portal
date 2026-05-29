import { expect, test } from '@playwright/test'

const createdClippingId: string | null = null

test.describe
  .serial('Clipping — AI Agent Creation', () => {
    // Serial: avoid Bedrock throttling from parallel requests
    // Longer timeout: agent takes ~60-120s with sample_articles
    test.setTimeout(300000)

    test.afterAll(async ({ request }) => {
      if (createdClippingId) {
        await request.delete(`/api/clipping/${createdClippingId}`)
      }
    })

    test('generates recortes with AI agent and shows SSE timeline', async ({
      page,
    }) => {
      await page.goto('/minha-conta/clipping/novo')
      await page.waitForLoadState('networkidle').catch(() => {})

      // Agent mode should be default
      await expect(page.locator('#agent-prompt')).toBeVisible()

      // Type prompt
      await page.fill('#agent-prompt', 'saude publica e vacinacao')

      // Click generate
      await page.click('text=Gerar Recortes com IA')

      // SSE timeline should show progress
      await expect(page.locator('text=Analisando o pedido')).toBeVisible({
        timeout: 15_000,
      })

      // Wait for completion OR detect ThrottlingException da Bedrock.
      // Quando os projects chromium-authed e mobile-authed rodam em
      // paralelo, o segundo request pode ser throttlado e o agente
      // dispara `An error occurred (ThrottlingException) ... reached max
      // retries`. Esse é um efeito de infra (não de produto), então
      // pulamos graciosamente em vez de falhar.
      const success = page.locator('text=Pronto!')
      const throttled = page.locator('text=ThrottlingException')
      await expect(success.or(throttled)).toBeVisible({ timeout: 180_000 })

      if (await throttled.isVisible().catch(() => false)) {
        test.skip(
          true,
          'Bedrock ThrottlingException — provavelmente request paralelo do outro project; skip para evitar falso negativo',
        )
        return
      }

      // Recortes preview should appear
      await expect(page.locator('text=Usar estes recortes')).toBeVisible()
    })

    test('accepting recortes fills name and switches to manual mode', async ({
      page,
    }) => {
      await page.goto('/minha-conta/clipping/novo')
      await page.waitForLoadState('networkidle')

      await page.fill('#agent-prompt', 'saude publica e vacinacao')
      await page.click('text=Gerar Recortes com IA')

      // Wait for result OR Bedrock throttling — skip se throttled.
      const success = page.locator('text=Usar estes recortes')
      const throttled = page.locator('text=ThrottlingException')
      await expect(success.or(throttled)).toBeVisible({ timeout: 180_000 })
      if (await throttled.isVisible().catch(() => false)) {
        test.skip(true, 'Bedrock ThrottlingException — request paralelo')
        return
      }

      // Accept
      await page.click('text=Usar estes recortes')

      // Should switch to manual mode with name pre-filled
      await expect(page.locator('#clipping-name')).toBeVisible()
      const nameValue = await page.locator('#clipping-name').inputValue()
      expect(nameValue.length).toBeGreaterThan(0)

      // Manual mode should show recorte editors
      await expect(page.locator('text=Adicionar Recorte')).toBeVisible()
    })

    test('full flow: agent → accept → schedule → channels → confirm', async ({
      page,
    }) => {
      await page.goto('/minha-conta/clipping/novo')
      await page.waitForLoadState('networkidle')

      // Generate with agent
      await page.fill('#agent-prompt', 'tecnologia e inovacao')
      await page.click('text=Gerar Recortes com IA')
      const success = page.locator('text=Usar estes recortes')
      const throttled = page.locator('text=ThrottlingException')
      await expect(success.or(throttled)).toBeVisible({ timeout: 180_000 })
      if (await throttled.isVisible().catch(() => false)) {
        test.skip(true, 'Bedrock ThrottlingException — request paralelo')
        return
      }
      await page.click('text=Usar estes recortes')

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
      await expect(page).toHaveURL(/minha-conta\/clipping/, { timeout: 15000 })
    })
  })
