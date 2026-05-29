import path from 'node:path'
import { expect, test as setup } from '@playwright/test'

/**
 * Setup project para autenticação contra portal staging via Keycloak.
 *
 * O portal staging usa `AUTH_GOVBR_IDP_HINT=google`, que faz o Keycloak pular
 * sua tela de login e ir direto para o IdP externo (Google). Como o e2e-bot é
 * um usuário **local** do Keycloak (não federado), precisamos remover o
 * `kc_idp_hint` antes do redirect — assim o Keycloak mostra a tela própria de
 * login com username/password.
 *
 * Fluxo:
 *  1. POST /api/auth/csrf → CSRF token
 *  2. Intercepta a navegação para o issuer Keycloak e remove `kc_idp_hint`
 *  3. POST /api/auth/signin/govbr → 302 para Keycloak (sem hint, mostra form)
 *  4. Preenche username/password do bot
 *  5. Keycloak → callback /api/auth/callback/govbr → sessão NextAuth
 *  6. Salva storageState
 *
 * Variáveis de ambiente:
 *  - E2E_BOT_PASSWORD (obrigatória) — senha do bot, vem do Secret Manager
 *  - PLAYWRIGHT_BASE_URL (opcional) — URL do portal (default: staging)
 *  - E2E_BOT_USERNAME (opcional) — default: e2e-bot@destaquesgovbr.gov.br
 *  - E2E_AUTH_STATE (opcional) — path do storageState (default: e2e/.auth/staging.json)
 */

const STAGING_URL =
  'https://destaquesgovbr-portal-staging-klvx64dufq-rj.a.run.app'

const authFile = path.join(
  __dirname,
  '.auth',
  process.env.E2E_AUTH_STATE_FILENAME ?? 'staging.json',
)

setup('authenticate e2e-bot via keycloak', async ({ page, context }) => {
  if (!process.env.E2E_BOT_PASSWORD) {
    throw new Error(
      'E2E_BOT_PASSWORD env var é obrigatória. Rode: source ./scripts/e2e/load-creds.sh',
    )
  }

  const portalUrl = process.env.PLAYWRIGHT_BASE_URL ?? STAGING_URL
  const botUsername =
    process.env.E2E_BOT_USERNAME ?? 'e2e-bot@destaquesgovbr.gov.br'

  // Remove kc_idp_hint da URL de autorização do Keycloak.
  // Isso força o Keycloak a mostrar a tela própria de login (em vez de
  // redirecionar para o IdP externo Google configurado em staging).
  await page.route(
    /\/realms\/destaquesgovbr\/protocol\/openid-connect\/auth\?/,
    async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.has('kc_idp_hint')) {
        url.searchParams.delete('kc_idp_hint')
        await route.continue({ url: url.toString() })
      } else {
        await route.continue()
      }
    },
  )

  // Inicia o signin do NextAuth — vai redirecionar para o Keycloak.
  await page.goto(`${portalUrl}/api/auth/signin`)

  // Clica no botão "Continuar com Gov.Br" da tela do NextAuth (ou usa o GET
  // direto). Como a tela default do NextAuth é instável de selecionar,
  // navegamos direto pro endpoint POST via form.
  await page.evaluate(async (baseUrl) => {
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = `${baseUrl}/api/auth/signin/govbr`
    const csrfInput = document.createElement('input')
    csrfInput.name = 'csrfToken'
    csrfInput.value = csrfToken
    form.appendChild(csrfInput)
    const cbInput = document.createElement('input')
    cbInput.name = 'callbackUrl'
    cbInput.value = `${baseUrl}/`
    form.appendChild(cbInput)
    document.body.appendChild(form)
    form.submit()
  }, portalUrl)

  // Aguarda chegar na tela de login do Keycloak.
  await page.waitForURL(/keycloak.*\/realms\/destaquesgovbr\/.*\/auth/, {
    timeout: 30_000,
  })

  // A página de login do Keycloak tem #username e #password.
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 })
  await page.fill('#username', botUsername)
  await page.fill('#password', process.env.E2E_BOT_PASSWORD)

  // O botão de submit do Keycloak é input[type=submit] com id #kc-login.
  await Promise.all([
    page.waitForURL(new RegExp(`^${portalUrl}`), { timeout: 30_000 }),
    page.click('#kc-login, input[type="submit"][name="login"]'),
  ])

  // Confirma que a sessão NextAuth está ativa.
  const session = await page.request.get(`${portalUrl}/api/auth/session`)
  expect(session.ok()).toBeTruthy()
  const sessionData = (await session.json()) as {
    user?: { email?: string }
  } | null
  expect(sessionData?.user?.email).toBe(botUsername)

  await context.storageState({ path: authFile })
})
