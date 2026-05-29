import { expect, test } from '@playwright/test'

const hasAuth = !!process.env.AUTH_GOVBR_ISSUER || !!process.env.AUTH_GOOGLE_ID

test.describe('Clipping — Acesso não autenticado', () => {
  test('redireciona para login ao acessar /minha-conta/clipping sem sessão', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping')

    // O layout (logged-in) redireciona para /api/auth/signin quando não há sessão
    await expect(page).toHaveURL(/auth|signin|login/, { timeout: 10000 })
  })

  test('redireciona para login ao acessar /minha-conta/clipping/novo sem sessão', async ({
    page,
  }) => {
    await page.goto('/minha-conta/clipping/novo')

    await expect(page).toHaveURL(/auth|signin|login/, { timeout: 10000 })
  })
})

test.describe('Push Subscriber — Banner de Clipping', () => {
  test('usuário não autenticado vê banner de Clipping no push subscriber', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Abre o sheet do push subscriber clicando no ícone de sino.
    // O ícone alterna entre `Bell` (subscrito) e `BellOff` (não subscrito) —
    // o usuário não autenticado em ambiente CI sempre vê `BellOff`. Usamos
    // o aria-label estável do botão em vez do classname do svg.
    const bellButton = page
      .locator(
        'button[aria-label="Ativar notificações"]:visible, button[aria-label="Gerenciar notificações (ativas)"]:visible',
      )
      .first()
    await expect(bellButton).toBeVisible({ timeout: 10_000 })

    // O Sheet do Radix só monta após o click ter sido processado pelo
    // handler React — em cold start de Cloud Run isso pode demorar. Em
    // vez de um único click + sleep fixo, fazemos retries até detectar
    // o conteúdo do Sheet (SheetTitle "Notificações WebPush").
    const sheetTitle = page.getByText(/notificações webpush/i)
    for (let attempt = 0; attempt < 3; attempt++) {
      await bellButton.click({ timeout: 5_000 }).catch(() => {})
      const opened = await sheetTitle
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
      if (opened) break
    }
    await expect(sheetTitle.first()).toBeVisible({ timeout: 5_000 })

    // Verifica que o banner de promoção do Clipping está visível.
    // O texto está dentro de um `<p>` parcial — usamos regex parcial.
    await expect(page.getByText(/recursos avançados/i)).toBeVisible({
      timeout: 10_000,
    })

    // Verifica o link de login
    await expect(page.getByRole('link', { name: /faça login/i })).toBeVisible()
  })

  test('banner de Clipping possui link para /api/auth/signin', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bellButton = page
      .locator(
        'button[aria-label="Ativar notificações"]:visible, button[aria-label="Gerenciar notificações (ativas)"]:visible',
      )
      .first()
    await expect(bellButton).toBeVisible({ timeout: 10_000 })

    // Retries até o Sheet abrir (mesmo motivo do teste anterior).
    const sheetTitle = page.getByText(/notificações webpush/i)
    for (let attempt = 0; attempt < 3; attempt++) {
      await bellButton.click({ timeout: 5_000 }).catch(() => {})
      const opened = await sheetTitle
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
      if (opened) break
    }
    await expect(sheetTitle.first()).toBeVisible({ timeout: 5_000 })

    const signinLink = page.getByRole('link', { name: /faça login/i })
    await expect(signinLink).toBeVisible({ timeout: 10_000 })
    await expect(signinLink).toHaveAttribute('href', '/api/auth/signin')
  })
})

test.describe('Clipping API — Endpoints públicos', () => {
  test('GET /api/clipping retorna 401 sem autenticação', async ({ page }) => {
    const res = await page.request.get('/api/clipping')
    expect(res.status()).toBe(401)
  })

  test('POST /api/clipping retorna 401 sem autenticação', async ({ page }) => {
    const res = await page.request.post('/api/clipping', {
      data: {
        recortes: [],
        scheduleTime: '08:00',
        deliveryChannels: [],
        prompt: '',
      },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Clipping Auth — Telegram linking', () => {
  test('GET /api/auth/telegram sem sessão redireciona para signin', async ({
    page,
  }) => {
    await page.goto('/api/auth/telegram?state=test-token-abc123')

    // Sem sessão deve redirecionar para login
    await expect(page).toHaveURL(/auth|signin|login/, { timeout: 10000 })
  })
})

// Testes autenticados — precisam de storageState com sessão válida configurada.
// Para habilitar: configure AUTH_GOVBR_ID/AUTH_GOOGLE_ID e gere storageState via
// `npx playwright codegen --save-storage=e2e/.auth/user.json http://localhost:3000`
// em seguida adicione `use: { storageState: 'e2e/.auth/user.json' }` nos projetos
// que precisam de autenticação no playwright.config.ts.
test.describe('Clipping — Área logada', () => {
  test.skip(
    !hasAuth,
    'Provedor de autenticação não configurado — teste requer sessão válida',
  )

  test.skip('exibe lista vazia para novo usuário', async ({ page }) => {
    // Requires authenticated session (storageState)
    // await page.goto('/minha-conta/clipping')
    // await expect(page.getByText(/nenhum clipping/i)).toBeVisible()
  })

  test.skip('navega para wizard ao clicar em "Novo Clipping"', async ({
    page,
  }) => {
    // Requires authenticated session (storageState)
    // await page.goto('/minha-conta/clipping')
    // await page.getByRole('link', { name: /novo clipping/i }).click()
    // await expect(page).toHaveURL(/\/minha-conta\/clipping\/novo/)
  })

  test.skip('completa wizard de criação — 4 passos', async ({ page }) => {
    // Requires authenticated session (storageState)
    // Passo 1: Recortes — adiciona filtros de tema/agência/keywords
    // Passo 2: Prompt — edita prompt LLM
    // Passo 3: Horário — seleciona horário de envio
    // Passo 4: Canais — seleciona canais (email/telegram/push)
    // await page.goto('/minha-conta/clipping/novo')
    // ...
  })

  test.skip('edita clipping existente', async ({ page }) => {
    // Requires authenticated session + existing clipping in Firestore
    // await page.goto('/minha-conta/clipping/[id]/editar')
    // ...
  })
})
