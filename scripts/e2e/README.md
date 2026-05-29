# Scripts E2E

Helpers para rodar os testes Playwright contra o portal **staging** com um
usuário bot real no Keycloak (sem login interativo via Gov.Br/Google).

## Bot

- **Usuário:** `e2e-bot@destaquesgovbr.gov.br` (criado direto no Keycloak,
  realm `destaquesgovbr`)
- **Client OIDC dedicado:** `portal-e2e` (public client, Direct Access Grants
  habilitado)
- **Senha:** armazenada no GCP Secret Manager —
  `gs://...../secrets/keycloak-e2e-bot-password` (projeto `inspire-7-finep`)

Provisionamento manual (fora do Terraform por enquanto): ver issue
`destaquesgovbr/infra#180` (Keycloak via Terraform).

## Uso

```bash
# 1. Carrega senha do Secret Manager para a env atual
source ./scripts/e2e/load-creds.sh

# 2. Roda toda a suíte e2e contra staging
pnpm e2e:staging

# Opcional: só smoke tests (taggear com @smoke nas describes/tests)
pnpm e2e:smoke
```

## Obter um JWT direto

Útil para chamar a GraphQL API com autenticação real do usuário bot, sem
passar pelo portal:

```bash
./scripts/e2e/get-test-jwt.sh | jq -r .access_token
```

Decode (`jwt.io` ou `jq`) para conferir claims (`sub`, `email`,
`realm_access.roles`).

## Como o fluxo funciona

1. `auth.setup.ts` (Playwright setup project) inicia o login NextAuth.
2. O portal staging redireciona para o Keycloak com `kc_idp_hint=google` —
   o que pularia a tela de login local do Keycloak. Por isso o setup
   **intercepta** o request e remove esse parâmetro, forçando o Keycloak a
   exibir o form próprio com username/password.
3. O setup preenche o form com as creds do bot (lidas de
   `E2E_BOT_PASSWORD`) e segue o callback OIDC normal.
4. A sessão NextAuth é salva em `e2e/.auth/staging.json` (gitignored).
5. Testes `*.authed.spec.ts` reutilizam esse storageState.

Quando `PLAYWRIGHT_BASE_URL` **não** está definida, o config volta ao modo
local (dev-login + servidor `pnpm dev`).
