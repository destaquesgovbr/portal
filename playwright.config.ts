import { defineConfig, devices } from '@playwright/test'

/**
 * Quando `PLAYWRIGHT_BASE_URL` aponta para um portal remoto (staging/prod),
 * usamos um setup de auth que loga via Keycloak com o bot e2e e gravamos o
 * estado em `e2e/.auth/staging.json`. Nesse modo NÃO subimos o `webServer`
 * local.
 *
 * Sem `PLAYWRIGHT_BASE_URL`, o setup padrão (`auth-setup.ts`) usa dev-login
 * contra `http://localhost:3000` e grava em `e2e/.auth/user.json`.
 */
const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL
const isRemote = !!remoteBaseURL
const localBaseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const baseURL = remoteBaseURL ?? localBaseURL

const authStateFile = isRemote
  ? 'e2e/.auth/staging.json'
  : 'e2e/.auth/user.json'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  timeout: isRemote ? 60_000 : 15_000,
  expect: {
    timeout: isRemote ? 10_000 : 3_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: isRemote ? 30_000 : 10_000,
    actionTimeout: isRemote ? 15_000 : 5_000,
  },
  projects: [
    // Auth setup — runs first, saves session to e2e/.auth/{user,staging}.json
    {
      name: 'setup',
      testMatch: isRemote ? /auth\.setup\.ts/ : /auth-setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-authed',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStateFile,
      },
      dependencies: ['setup'],
      testMatch: /\.authed\.spec\.ts$/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-authed',
      use: {
        ...devices['Pixel 5'],
        storageState: authStateFile,
      },
      dependencies: ['setup'],
      testMatch: /\.authed\.spec\.ts$/,
    },
  ],
  // Não sobe servidor local quando rodando contra portal remoto.
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: 'pnpm run dev',
          url: localBaseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
})
