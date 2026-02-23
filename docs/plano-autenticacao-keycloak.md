# Plano de Implementação — Autenticação Gov.Br via Keycloak

> **Issue**: [#23 - Criar autenticação integrada com Gov.Br](https://github.com/destaquesgovbr/portal/issues/23)
> **Label**: size:XL (~1-2 semanas)

## Arquitetura

```
Usuário → Next.js (NextAuth.js + Keycloak provider builtin)
               ↓
          Keycloak (identity broker)
               ↓
          Gov.Br (IdP externo via OpenID Connect)
```

O Keycloak atua como **identity broker** entre o portal e o Gov.Br. O Next.js se comunica apenas com o Keycloak, e o Keycloak lida com o fluxo OAuth do Gov.Br.

O NextAuth.js possui um **provider nativo para Keycloak**, eliminando a necessidade de criar um provider customizado para Gov.Br. Toda a complexidade de OAuth com Gov.Br fica isolada na configuração do Keycloak.

## Comparativo: integração direta vs Keycloak

| Aspecto | Direto Gov.Br | Via Keycloak |
|---------|---------------|--------------|
| Provider NextAuth | Customizado (criar do zero) | Built-in (`keycloak`) |
| Refresh token | Implementar manualmente | Keycloak gerencia |
| Gerenciamento de usuários | Sem painel | Admin console do Keycloak |
| Federação Gov.Br | No Next.js | No Keycloak (config de IdP) |
| Complexidade no app | Alta | Baixa |
| Infraestrutura | Nenhuma extra | Requer instância Keycloak |

## Arquivos criados/modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar `next-auth@beta` |
| `.env.example` | Modificar | Variáveis do Keycloak |
| `src/auth.ts` | Criar | Configuração central do Auth.js v5 |
| `src/app/api/auth/[...nextauth]/route.ts` | Criar | Route handler |
| `src/middleware.ts` | Modificar | Integrar auth middleware |
| `src/components/common/Providers.tsx` | Modificar | Adicionar SessionProvider |
| `src/components/layout/Header.tsx` | Modificar | Adicionar botão login/perfil |
| `src/components/auth/AuthButton.tsx` | Criar | Componente de autenticação |

## Fases de implementação

### Fase 1 — Infraestrutura Keycloak

1. Provisionar instância Keycloak (Docker ou serviço gerenciado)
2. Criar realm (ex: `govbr-portal`)
3. Configurar Gov.Br como **Identity Provider externo** no Keycloak:
   - Tipo: OpenID Connect v1.0
   - Authorization URL: `https://sso.acesso.gov.br/authorize`
   - Token URL: `https://sso.acesso.gov.br/token`
   - Client ID/Secret obtidos junto à SGD
   - Default Scopes: `openid email profile govbr_confiabilidades`
4. Criar client para o portal (ex: `portal-destaques`)
   - Access Type: `confidential`
   - Valid Redirect URIs: `https://portal.gov.br/api/auth/callback/keycloak`
5. Configurar mappers para propagar claims do Gov.Br (CPF, nível de confiabilidade)

### Fase 2 — Setup no Next.js

#### 2.1 Dependência

```bash
pnpm add next-auth@beta
```

Apenas **uma** dependência. O provider Keycloak já vem incluso no `next-auth`.

#### 2.2 Variáveis de ambiente

Adicionar ao `.env.example`:

```env
# Keycloak
AUTH_SECRET=gerar-com-openssl-rand-base64-32
AUTH_KEYCLOAK_ID=portal-destaques
AUTH_KEYCLOAK_SECRET=secret-do-client-no-keycloak
AUTH_KEYCLOAK_ISSUER=https://keycloak.exemplo.gov.br/realms/govbr-portal
```

#### 2.3 Configuração central — `src/auth.ts`

```typescript
import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Na primeira autenticação, salvar tokens do Keycloak
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Refresh automático se token não expirou
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token
      }

      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? ""
      return session
    },
  },
})

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const response = await fetch(
      `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AUTH_KEYCLOAK_ID!,
          client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken as string,
        }),
      }
    )

    const refreshed = await response.json()
    if (!response.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}
```

#### 2.4 Route handler — `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

Apenas 2 linhas. O Auth.js v5 gera as rotas `/api/auth/signin`, `/api/auth/callback/keycloak` e `/api/auth/signout` automaticamente.

### Fase 3 — Middleware

Atualizar `src/middleware.ts` para integrar o auth sem bloquear rotas (o portal continua público):

```typescript
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default auth((request: NextRequest) => {
  // Preserva lógica existente de detecção de pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
```

O matcher é ajustado para excluir `/api/auth` das interceptações.

### Fase 4 — Session Provider

Atualizar `src/components/common/Providers.tsx`:

```typescript
"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ABDebugPanel, GrowthBookProvider } from "@/ab-testing"
import { ClarityScript } from "@/components/analytics/ClarityScript"
import { UmamiScript } from "@/components/analytics/UmamiScript"
import { ConsentProvider } from "@/components/consent/ConsentProvider"
import { CookieConsent } from "@/components/consent/CookieConsent"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConsentProvider>
        <GrowthBookProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <CookieConsent />
            <ClarityScript />
            <UmamiScript />
            <ABDebugPanel />
          </QueryClientProvider>
        </GrowthBookProvider>
      </ConsentProvider>
    </SessionProvider>
  )
}
```

### Fase 5 — Componentes de UI

#### 5.1 Componente AuthButton — `src/components/auth/AuthButton.tsx`

```typescript
"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
  }

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => signIn("keycloak")}
        className="gap-2"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden lg:inline">Entrar com Gov.Br</span>
      </Button>
    )
  }

  const initials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-government-blue text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm font-medium">
          {session.user?.name}
        </div>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

Usa componentes shadcn/ui já existentes no projeto (`Avatar`, `DropdownMenu`, `Button`).

#### 5.2 Modificação no Header — `src/components/layout/Header.tsx`

Adicionar o `AuthButton` ao lado direito do header, tanto no desktop quanto no mobile:

```diff
+ import { AuthButton } from '@/components/auth/AuthButton'

  {/* Desktop search bar */}
  <div className="hidden md:flex flex-1 justify-center px-4">
    ...
  </div>

+ {/* Auth button - desktop */}
+ <div className="hidden md:flex shrink-0">
+   <AuthButton />
+ </div>

  {/* Mobile search icon - right side */}
- <div className="flex md:hidden ml-auto">
+ <div className="flex md:hidden ml-auto gap-1">
+   <AuthButton />
    <Button variant="ghost" size="icon" ...>
```

### Fase 6 — Tratamento de erros

Criar página de erro em `src/app/auth/error/page.tsx` para exibir mensagens amigáveis quando a autenticação falhar (token expirado, callback inválido, etc.).

## Configuração do Keycloak (admin console)

1. **Criar Realm**: `govbr-portal`
2. **Criar Client**: `portal-destaques`
   - Client type: OpenID Connect
   - Client authentication: On (confidential)
   - Standard flow: Enabled
   - Valid Redirect URIs: `https://portal.gov.br/api/auth/callback/keycloak`
   - Web Origins: `https://portal.gov.br`
3. **Adicionar Identity Provider** → OpenID Connect v1.0:
   - Alias: `govbr`
   - Display Name: `Gov.Br`
   - Authorization URL: `https://sso.acesso.gov.br/authorize`
   - Token URL: `https://sso.acesso.gov.br/token`
   - UserInfo URL: `https://sso.acesso.gov.br/userinfo`
   - Client ID: (credencial obtida junto à SGD)
   - Client Secret: (credencial obtida junto à SGD)
   - Default Scopes: `openid email profile govbr_confiabilidades`
4. **Configurar Mappers** para propagar claims do Gov.Br:
   - CPF
   - Nome completo
   - Nível de confiabilidade (`govbr_confiabilidades`)

## Pré-requisitos (bloqueantes)

- [ ] Solicitar integração junto à SGD (Secretaria de Governo Digital)
- [ ] Realizar cadastro do App DestaquesGovBr no portal de integração
- [ ] Obter credenciais OAuth (client_id, client_secret) do Gov.Br
- [ ] Provisionar instância Keycloak (Docker ou serviço gerenciado)

## Referências

- [Portal de Integração Gov.Br](https://acesso.gov.br/)
- [Documentação Login Único](https://manual-roteiro-integracao-login-unico.servicos.gov.br/)
- [Roteiro de Integração](https://manual-roteiro-integracao-login-unico.servicos.gov.br/pt/stable/iniciarintegracao.html)
- [Auth.js v5 (NextAuth)](https://authjs.dev/)
- [Auth.js Keycloak Provider](https://authjs.dev/getting-started/providers/keycloak)
- [Keycloak Identity Brokering](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker)
