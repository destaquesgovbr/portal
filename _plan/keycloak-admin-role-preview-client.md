# Integração Keycloak: Role `admin` + Cliente Preview + Bypass de Convite

## Contexto

O sistema de convites tem um problema de bootstrap: não há como o primeiro admin logar sem código de convite. Além disso, o deploy preview usa Google OAuth direto (sem Keycloak), impedindo testar o fluxo real de auth. Vamos resolver ambos:

1. Usar a **role `admin`** do Keycloak (já existe no realm) para determinar quem é admin
2. Criar um **cliente `portal-preview`** no Keycloak para previews usarem o mesmo fluxo de auth
3. Admins com role `admin` podem **logar sem código de convite** (bypass do gate)

## Estado Atual

**Keycloak** (`/Users/nitai/dev/destaquesgovbr/keycloak/realm-export.json`):
- Realm `destaquesgovbr` com roles: `admin`, `editor`, `analyst`, `viewer`
- Clientes: `portal` (prod), `portal-staging` (staging) — **sem `portal-preview`**
- Clientes não têm protocol mappers (roles já vêm no access token por padrão do Keycloak, mas precisamos garantir que venham no ID token)
- `configure.sh` aplica flow override para `portal` e `portal-staging`

**Portal preview** (`deploy-preview.yml` linha 111):
- Usa `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — Google OAuth direto, sem Keycloak
- Não tem `AUTH_GOVBR_*` configurado

**Portal auth** (`src/auth.ts`):
- Profile callback extrai apenas `sub`, `name`, `email`
- Não extrai roles do token
- `src/lib/admin.ts` usa `ADMIN_EMAILS` env var

## Plano

### 1. Keycloak: Adicionar cliente `portal-preview` e realm role mapper

**Arquivo:** `/Users/nitai/dev/destaquesgovbr/keycloak/realm-export.json`

**1a.** Adicionar cliente `portal-preview` (copiar `portal-staging` com redirect URIs wildcarded para qualquer preview URL):
- `clientId`: `portal-preview`
- `redirectUris`: `["https://portal-preview-*-990583792367.southamerica-east1.run.app/api/auth/callback/govbr"]`
- `webOrigins`: `["https://portal-preview-*-990583792367.southamerica-east1.run.app"]`
- `secret`: `${KC_PORTAL_PREVIEW_CLIENT_SECRET}` (novo placeholder)
- Mesmo auth flow override (`portal-direct-idp`)

**1b.** Adicionar protocol mapper `realm-roles` nos 3 clientes (`portal`, `portal-staging`, `portal-preview`) para incluir realm roles no ID token:
```json
{
  "name": "realm-roles",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-realm-role-mapper",
  "config": {
    "multivalued": "true",
    "claim.name": "realm_roles",
    "id.token.claim": "true",
    "access.token.claim": "true",
    "userinfo.token.claim": "true",
    "jsonType.label": "String"
  }
}
```

**1c.** Atualizar `docker-entrypoint.sh` — adicionar substituição de `${KC_PORTAL_PREVIEW_CLIENT_SECRET}`

**1d.** Atualizar `configure.sh` — aplicar flow override também para `portal-preview`

### 2. Keycloak: Secret e deploy

- Criar secret `keycloak-portal-preview-client-secret` no GCP Secret Manager (ou reusar um existente)
- Adicionar env var `KC_PORTAL_PREVIEW_CLIENT_SECRET` no Cloud Run do Keycloak
- Commit e push → CI/CD deploya

### 3. Portal: Atualizar `deploy-preview.yml`

**Arquivo:** `.github/workflows/deploy-preview.yml`

Mudar o step "Deploy to Cloud Run" (linha 111) de Google OAuth para Keycloak:
```yaml
--set-env-vars "NODE_ENV=preview,AUTH_GOVBR_ID=portal-preview,AUTH_GOVBR_ISSUER=https://destaquesgovbr-keycloak-klvx64dufq-rj.a.run.app/realms/destaquesgovbr,AUTH_GOVBR_IDP_HINT=google"
--set-secrets "AUTH_SECRET=auth-secret:latest,AUTH_GOVBR_SECRET=keycloak-portal-preview-client-secret:latest"
```

Remover `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` do deploy preview.

### 4. Portal: Type augmentation para NextAuth

**Criar:** `src/types/next-auth.d.ts`
```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      roles: string[]
    }
  }
}
```

### 5. Portal: Atualizar `src/auth.ts`

- Profile callback: extrair `realm_roles` do profile (claim adicionada pelo mapper)
- JWT callback: armazenar `roles` no token no primeiro login
- Session callback: expor `session.user.roles`

### 6. Portal: Atualizar `src/lib/admin.ts`

Mudar `isAdmin()` para checar role:
```typescript
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user) return false
  // Keycloak role
  if (session.user.roles?.includes('admin')) return true
  // Fallback: env var (para dev local sem Keycloak)
  const adminEmails = getAdminEmails()
  return adminEmails.includes(session.user.email ?? '')
}
```

### 7. Portal: Admin bypass no gate de convite

**Criar:**
- `src/app/(public)/convite/admin/page.tsx` — Se já logado + admin → home. Senão → botão signIn direto
- `src/app/(public)/convite/admin/client.tsx` — Botão signIn (sem código)
- `src/app/(public)/convite/admin/callback/page.tsx` — Pós-OAuth: verifica role admin, cria user profile no Firestore, redirect home

### 8. Portal: Atualizar testes

- `src/lib/__tests__/admin.test.ts` — Testes para isAdmin com roles
- `src/__tests__/mocks/auth.ts` — Adicionar `roles` ao mock

## Arquivos Modificados

| Repo | Arquivo | Ação |
|------|---------|------|
| keycloak | `realm-export.json` | Modificar — cliente preview + role mapper nos 3 clientes |
| keycloak | `docker-entrypoint.sh` | Modificar — substituição de `KC_PORTAL_PREVIEW_CLIENT_SECRET` |
| keycloak | `configure.sh` | Modificar — flow override para `portal-preview` |
| portal | `.github/workflows/deploy-preview.yml` | Modificar — usar Keycloak em vez de Google direto |
| portal | `src/types/next-auth.d.ts` | Criar — type augmentation com roles |
| portal | `src/auth.ts` | Modificar — extrair roles do profile |
| portal | `src/lib/admin.ts` | Modificar — checar role em vez de email |
| portal | `src/app/(public)/convite/admin/page.tsx` | Criar |
| portal | `src/app/(public)/convite/admin/client.tsx` | Criar |
| portal | `src/app/(public)/convite/admin/callback/page.tsx` | Criar |
| portal | `src/lib/__tests__/admin.test.ts` | Modificar |
| portal | `src/__tests__/mocks/auth.ts` | Modificar |

## Ordem de Execução

1. **Keycloak** — realm-export.json + entrypoint + configure.sh → commit → push → deploy
2. **GCP** — criar secret `keycloak-portal-preview-client-secret` + adicionar env var ao Cloud Run do Keycloak
3. **Portal types** — next-auth.d.ts
4. **Portal auth** — auth.ts (profile, jwt, session)
5. **Portal admin** — admin.ts + testes
6. **Portal convite/admin** — páginas de bypass admin
7. **Portal workflow** — deploy-preview.yml
8. **Portal deploy** — push + re-deploy preview

## Verificação

1. Deploy Keycloak com novo realm → verificar no admin console que `portal-preview` existe
2. Atribuir role `admin` ao seu user no Keycloak admin console
3. Re-deploy preview do portal → acessar `/convite/admin` → login via Keycloak/Google → redirect para home
4. Verificar que `session.user.roles` contém `admin`
5. Verificar que `/admin/convites` e `/convites` estão acessíveis
6. `pnpm vitest run` + `pnpm build` passam
