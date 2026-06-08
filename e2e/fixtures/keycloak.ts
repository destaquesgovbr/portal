/**
 * Helpers de autenticação Keycloak para fixtures E2E.
 *
 * Compartilha a lógica de Direct Access Grant (Resource Owner Password) usada
 * em `e2e/auth.setup.ts`, mas isolada aqui para que as fixtures possam obter
 * um `access_token` Keycloak diretamente — sem depender do cookie de sessão do
 * portal. Esse token é usado para falar com o `graphql-api` direto (setup e
 * teardown de dados), espelhando o Bearer que o portal envia em produção.
 *
 * O realm `destaquesgovbr` redireciona o flow browser para o IdP Google, então
 * o Direct Access Grant no client público `portal-e2e` é o único caminho
 * programático para autenticar o bot `e2e-bot@destaquesgovbr.gov.br`.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_KC_URL = 'https://destaquesgovbr-keycloak-klvx64dufq-rj.a.run.app'
const KC_REALM = 'destaquesgovbr'
const KC_CLIENT_ID = 'portal-e2e'
const DEFAULT_BOT_USERNAME = 'e2e-bot@destaquesgovbr.gov.br'

export interface KeycloakTokenResponse {
  access_token: string
  refresh_token: string
  id_token?: string
  expires_in: number
  token_type: string
}

/** URL base do Keycloak (default: Cloud Run staging, override via `KC_URL`). */
export function keycloakUrl(): string {
  return process.env.KC_URL ?? DEFAULT_KC_URL
}

/**
 * Cache de token compartilhado entre workers do Playwright.
 *
 * Motivação: cada fixture que cria um `E2EGraphQLClient` chamava
 * `fetchBotAccessToken()`, que fazia um Direct Access Grant (password) do mesmo
 * bot. Com vários workers em paralelo, dezenas de grants do mesmo usuário caíam
 * dentro da janela de "quick login" do Keycloak (`quickLoginCheckMilliSeconds`,
 * default 1s), disparando o brute-force detection e retornando `invalid_grant`
 * mesmo com a senha certa.
 *
 * Solução: persistir o token (e o `refresh_token`) num arquivo dentro de
 * `e2e/.auth/` — o nome `*.local.json` já casa o `.gitignore`, então a
 * credencial nunca é commitada — reusá-lo enquanto válido e, ao expirar, renovar
 * via `grant_type=refresh_token` (que NÃO conta como login → não dispara
 * brute-force). O `auth.setup.ts` pré-popula o cache com 1 grant antes de
 * qualquer fixture rodar, então no fluxo normal o run inteiro faz apenas 1
 * password-grant.
 */
const TOKEN_CACHE_FILE = path.join(
  __dirname,
  '..',
  '.auth',
  'bot-token.local.json',
)
const EXPIRY_BUFFER_SECONDS = 30

interface CachedToken {
  access_token: string
  refresh_token?: string
  /** epoch (ms) em que o token foi obtido */
  obtained_at: number
  /** validade em segundos (campo `expires_in` do Keycloak) */
  expires_in: number
}

/** Conjunto completo de tokens do bot, derivado do cache ou de um grant. */
export interface BotTokens {
  access_token: string
  refresh_token?: string
  /** validade em segundos — restante real quando vindo do cache */
  expires_in: number
}

let memoryToken: CachedToken | null = null
let inflight: Promise<BotTokens> | null = null

/** Segundos de validade restantes de um token cacheado (nunca negativo). */
function remainingExpiresIn(t: CachedToken): number {
  const ageSec = (Date.now() - t.obtained_at) / 1000
  return Math.max(0, Math.floor(t.expires_in - ageSec))
}

/** Converte um `CachedToken` para o conjunto completo, corrigindo `expires_in`. */
function cachedToBotTokens(t: CachedToken): BotTokens {
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_in: remainingExpiresIn(t),
  }
}

function tokenIsFresh(t: CachedToken | null): boolean {
  if (!t?.access_token) return false
  const ageMs = Date.now() - t.obtained_at
  const ttlMs = (t.expires_in - EXPIRY_BUFFER_SECONDS) * 1000
  return ttlMs > 0 && ageMs < ttlMs
}

function readTokenCacheFile(): CachedToken | null {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')) as CachedToken
  } catch {
    return null
  }
}

/**
 * Persiste tokens no cache (memória + arquivo). Chamado pelo `auth.setup.ts`
 * logo após o grant inicial e por `fetchBotAccessToken` ao renovar.
 */
export function writeTokenCache(tokens: {
  access_token: string
  refresh_token?: string
  expires_in: number
}): void {
  const entry: CachedToken = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    obtained_at: Date.now(),
    expires_in: tokens.expires_in,
  }
  memoryToken = entry
  try {
    fs.mkdirSync(path.dirname(TOKEN_CACHE_FILE), { recursive: true })
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(entry), 'utf8')
  } catch {
    // cache em arquivo é best-effort; a memória do worker já guardou o token
  }
}

async function requestToken(
  body: URLSearchParams,
): Promise<KeycloakTokenResponse> {
  const tokenEndpoint = `${keycloakUrl()}/realms/${KC_REALM}/protocol/openid-connect/token`
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Keycloak token endpoint retornou ${res.status}: ${text.slice(0, 500)}`,
    )
  }
  const tokens = (await res.json()) as KeycloakTokenResponse
  if (!tokens.access_token) {
    throw new Error('Keycloak não retornou access_token')
  }
  return tokens
}

function passwordGrant(): Promise<KeycloakTokenResponse> {
  const password = process.env.E2E_BOT_PASSWORD
  if (!password) {
    throw new Error(
      'E2E_BOT_PASSWORD ausente. Rode: source ./scripts/e2e/load-creds.sh',
    )
  }
  const username = process.env.E2E_BOT_USERNAME ?? DEFAULT_BOT_USERNAME
  return requestToken(
    new URLSearchParams({
      grant_type: 'password',
      client_id: KC_CLIENT_ID,
      username,
      password,
      scope: 'openid email profile',
    }),
  )
}

async function refreshGrant(
  refreshToken: string,
): Promise<KeycloakTokenResponse | null> {
  try {
    return await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: KC_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    )
  } catch {
    // refresh expirado/inválido → cai no password grant
    return null
  }
}

/**
 * Obtém o conjunto COMPLETO de tokens do bot E2E (access + refresh + expires_in),
 * reusando o cache compartilhado. Fonte única de verdade da ordem de obtenção.
 *
 * Ordem: memória do worker → arquivo de cache → `refresh_token` → password grant.
 * Coalesce chamadas concorrentes no mesmo worker (uma única ida em voo). Escreve
 * o cache (memória + arquivo) sempre que renova ou faz password grant.
 *
 * Quando o token vem do cache (memória ou arquivo), `expires_in` é corrigido para
 * os segundos de validade RESTANTES — não o valor original do grant. Assim quem
 * usa `expires_in` para calcular `expiresAt` (ex.: `auth.setup.ts`) não
 * super-estima a expiração de um token já parcialmente consumido.
 *
 * Requer `E2E_BOT_PASSWORD` no ambiente (via `scripts/e2e/load-creds.sh`)
 * apenas quando precisar do password grant — com cache/refresh válidos, não.
 */
export async function getCachedBotTokens(): Promise<BotTokens> {
  if (memoryToken && tokenIsFresh(memoryToken))
    return cachedToBotTokens(memoryToken)
  if (inflight) return inflight

  inflight = (async () => {
    if (memoryToken && tokenIsFresh(memoryToken))
      return cachedToBotTokens(memoryToken)

    const cached = readTokenCacheFile()
    if (cached && tokenIsFresh(cached)) {
      memoryToken = cached
      return cachedToBotTokens(cached)
    }

    // Token expirado mas com refresh_token: renova (não dispara brute-force).
    if (cached?.refresh_token) {
      const refreshed = await refreshGrant(cached.refresh_token)
      if (refreshed) {
        writeTokenCache(refreshed)
        return {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_in: refreshed.expires_in,
        }
      }
    }

    // Fallback: novo password grant (raro — só sem cache/refresh válidos).
    const tokens = await passwordGrant()
    writeTokenCache(tokens)
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    }
  })().finally(() => {
    inflight = null
  })

  return inflight
}

/**
 * Obtém apenas o `access_token` do bot E2E, reusando o cache compartilhado.
 *
 * Delega a `getCachedBotTokens()` (mesma ordem memória → arquivo → refresh →
 * password) e devolve só o `access_token` — assinatura preservada para as
 * fixtures que dependem de `Promise<string>`.
 */
export async function fetchBotAccessToken(): Promise<string> {
  return (await getCachedBotTokens()).access_token
}

/** Decodifica o payload de um JWT (sem validar — só para extrair claims). */
export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string,
): T {
  const parts = token.split('.')
  if (parts.length < 2) {
    throw new Error('Token JWT inválido (esperava header.payload.signature)')
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
  return JSON.parse(payload) as T
}
