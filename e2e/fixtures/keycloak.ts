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
 * Obtém um `access_token` do bot E2E via Direct Access Grant.
 *
 * Requer `E2E_BOT_PASSWORD` no ambiente (carregado por
 * `scripts/e2e/load-creds.sh`). Lança erro verboso se faltar — nunca silencia.
 */
export async function fetchBotAccessToken(): Promise<string> {
  const password = process.env.E2E_BOT_PASSWORD
  if (!password) {
    throw new Error(
      'E2E_BOT_PASSWORD ausente. Rode: source ./scripts/e2e/load-creds.sh',
    )
  }
  const username = process.env.E2E_BOT_USERNAME ?? DEFAULT_BOT_USERNAME
  const tokenEndpoint = `${keycloakUrl()}/realms/${KC_REALM}/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KC_CLIENT_ID,
    username,
    password,
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
  const tokens = (await res.json()) as KeycloakTokenResponse
  if (!tokens.access_token) {
    throw new Error('Keycloak não retornou access_token')
  }
  return tokens.access_token
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
