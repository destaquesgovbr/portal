import crypto from 'node:crypto'
import path from 'node:path'
import { encode } from '@auth/core/jwt'
import { expect, test as setup } from '@playwright/test'

/**
 * Setup project para autenticação contra portal staging — bypassa o browser
 * OIDC flow inteiramente.
 *
 * Motivação: o realm Keycloak `destaquesgovbr` tem um Identity Provider
 * Redirector no flow `browser` configurado para `auto-redirect` ao IdP Google,
 * de modo que toda navegação para `/protocol/openid-connect/auth` é
 * redirecionada para Google — mesmo sem `kc_idp_hint`. Como o bot e2e é um
 * usuário local do Keycloak (não federado via Google), o flow browser-based
 * não funciona.
 *
 * Solução adotada:
 *  1. Obtém JWT do Keycloak via Direct Access Grant (Resource Owner Password)
 *     no client `portal-e2e`.
 *  2. Decodifica o `access_token` para extrair claims (`sub`, `email`, `name`,
 *     `realm_access.roles`).
 *  3. Forja um session token NextAuth v5 (JWE A256CBC-HS512) usando
 *     `@auth/core/jwt` — a mesma função `encode()` usada pelo portal
 *     internamente, garantindo compatibilidade total.
 *  4. Injeta o cookie `__Secure-authjs.session-token` no Playwright context.
 *  5. Valida com GET /api/auth/session e salva storageState.
 *
 * Variáveis de ambiente:
 *  - E2E_BOT_PASSWORD (obrigatória) — senha do bot, vem do Secret Manager
 *  - AUTH_SECRET (obrigatória) — mesma chave que o portal staging usa para
 *    cifrar cookies. Vem do Secret Manager (secret `auth-secret`).
 *  - PLAYWRIGHT_BASE_URL (opcional) — URL do portal (default: staging)
 *  - KC_URL (opcional) — URL do Keycloak (default: staging Keycloak)
 *  - E2E_BOT_USERNAME (opcional) — default: e2e-bot@destaquesgovbr.gov.br
 *  - E2E_AUTH_STATE_FILENAME (opcional) — default: staging.json
 */

const STAGING_PORTAL_URL =
  'https://destaquesgovbr-portal-staging-klvx64dufq-rj.a.run.app'
const STAGING_KC_URL = 'https://destaquesgovbr-keycloak-klvx64dufq-rj.a.run.app'
const KC_REALM = 'destaquesgovbr'
const KC_CLIENT_ID = 'portal-e2e'
const DEFAULT_BOT_USERNAME = 'e2e-bot@destaquesgovbr.gov.br'
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 dias

const authFile = path.join(
  __dirname,
  '.auth',
  process.env.E2E_AUTH_STATE_FILENAME ?? 'staging.json',
)

interface KeycloakTokenResponse {
  access_token: string
  refresh_token: string
  id_token?: string
  expires_in: number
  token_type: string
}

interface AccessTokenClaims {
  sub: string
  email?: string
  preferred_username?: string
  name?: string
  realm_access?: { roles?: string[] }
  exp: number
  iat: number
}

function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
  const parts = token.split('.')
  if (parts.length < 2) {
    throw new Error('Token JWT inválido (esperava header.payload.signature)')
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
  return JSON.parse(payload) as T
}

async function fetchKeycloakToken(opts: {
  kcUrl: string
  username: string
  password: string
}): Promise<KeycloakTokenResponse> {
  const tokenEndpoint = `${opts.kcUrl}/realms/${KC_REALM}/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KC_CLIENT_ID,
    username: opts.username,
    password: opts.password,
    scope: 'openid email profile',
  })
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
  return (await res.json()) as KeycloakTokenResponse
}

setup(
  'forge NextAuth session via Keycloak Direct Access Grant',
  async ({ context, request }) => {
    const botPassword = process.env.E2E_BOT_PASSWORD
    if (!botPassword) {
      throw new Error(
        'E2E_BOT_PASSWORD é obrigatória. Rode: source ./scripts/e2e/load-creds.sh',
      )
    }
    const authSecret = process.env.AUTH_SECRET
    if (!authSecret) {
      throw new Error(
        'AUTH_SECRET é obrigatória. Rode: source ./scripts/e2e/load-creds.sh',
      )
    }

    const portalUrl = process.env.PLAYWRIGHT_BASE_URL ?? STAGING_PORTAL_URL
    const kcUrl = process.env.KC_URL ?? STAGING_KC_URL
    const botUsername = process.env.E2E_BOT_USERNAME ?? DEFAULT_BOT_USERNAME
    const isHttps = portalUrl.startsWith('https://')
    const cookieName = isHttps
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

    // 1. Fetch JWT via Direct Access Grant.
    const tokens = await fetchKeycloakToken({
      kcUrl,
      username: botUsername,
      password: botPassword,
    })

    // 2. Decode access_token claims (sem validar — só para extrair metadados).
    const claims = decodeJwtPayload<AccessTokenClaims>(tokens.access_token)
    if (!claims.email && !claims.preferred_username) {
      throw new Error(
        `access_token do Keycloak não trouxe email nem preferred_username. ` +
          `Claims: ${JSON.stringify(Object.keys(claims))}`,
      )
    }

    const email = claims.email ?? claims.preferred_username ?? botUsername
    const name = claims.name ?? claims.preferred_username ?? 'E2E Bot'
    const realmRoles = claims.realm_access?.roles ?? []

    // 3. Constrói payload no formato esperado pelo NextAuth v5 jwt callback.
    //    O callback popula esses campos no 1º request (quando `account` chega);
    //    em requests subsequentes ele os preserva. Como vamos pular o login,
    //    setamos tudo manualmente para que `session.user` fique correto.
    const nowSec = Math.floor(Date.now() / 1000)
    const sessionPayload = {
      name,
      email,
      sub: claims.sub,
      // Campos custom populados pelo jwt() callback em src/auth.ts
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: nowSec + tokens.expires_in,
      provider: 'govbr' as const,
      // session.user.id usa stableUserId; sem firebase-admin no Playwright,
      // setamos como sub do Keycloak (mesma lógica de fallback do auth.ts).
      stableUserId: claims.sub,
      roles: realmRoles,
      // Standard JWT claims
      iat: nowSec,
      exp: nowSec + SESSION_MAX_AGE_SECONDS,
      jti: crypto.randomUUID(),
    }

    // 4. Encripta como JWE usando a MESMA função encode() do NextAuth.
    //    Salt = nome do cookie (incluindo prefix __Secure- quando HTTPS).
    const sessionToken = await encode({
      token: sessionPayload,
      secret: authSecret,
      salt: cookieName,
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    // 5. Injeta cookie no Playwright context.
    const portalHost = new URL(portalUrl).hostname
    await context.addCookies([
      {
        name: cookieName,
        value: sessionToken,
        domain: portalHost,
        path: '/',
        httpOnly: true,
        secure: isHttps,
        sameSite: 'Lax',
        expires: sessionPayload.exp,
      },
    ])

    // 6. Valida com GET /api/auth/session.
    const sessionRes = await request.get(`${portalUrl}/api/auth/session`, {
      headers: { Cookie: `${cookieName}=${sessionToken}` },
    })
    expect(
      sessionRes.ok(),
      `GET /api/auth/session retornou ${sessionRes.status()}`,
    ).toBeTruthy()
    const sessionData = (await sessionRes.json()) as {
      user?: { email?: string; id?: string }
    } | null
    expect(
      sessionData?.user?.email,
      `Sessão inválida — esperava email ${botUsername}, recebeu ${JSON.stringify(sessionData)}`,
    ).toBe(botUsername)

    // 7. Salva storageState para os outros projects.
    await context.storageState({ path: authFile })
  },
)
