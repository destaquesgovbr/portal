# Portal Destaques Gov.br - Guia para Claude

## Visão Geral do Projeto

Portal de notícias do Governo Federal brasileiro, desenvolvido com Next.js 15, que agrega e exibe conteúdo de diversos ministérios e órgãos governamentais. O projeto utiliza Typesense para busca e indexação de artigos.

**Nome do projeto**: portal
**Tecnologia principal**: Next.js 15.5.3 com App Router
**Deploy**: Standalone mode (configurado para containers)

## Arquitetura e Stack

### Frontend

- **Framework**: Next.js 15.5.3 (App Router)
- **Linguagem**: TypeScript 5
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS 4 + tailwindcss-animate
- **Animações**: Framer Motion
- **Gerenciamento de estado**: TanStack React Query (v5)
- **Autenticação**: NextAuth.js v5 (beta 30)
- **Formulários**: React Hook Form + Zod
- **Markdown**: react-markdown + remark-gfm + rehype-raw
- **Temas**: next-themes
- **Linting/Formatting**: Biome 2.2.0

### Backend/Dados

- **Busca**: Typesense 2.1.0
- **Revalidação**: ISR (Incremental Static Regeneration) a cada 10 minutos

### Ferramentas de Build

- **Package Manager**: pnpm
- **Build Tool**: Next.js Turbopack
- **Container**: Docker (Dockerfile presente)

## Estrutura de Diretórios

```
/portal
├── src/
│   ├── auth.ts                 # Configuração central do NextAuth
│   ├── middleware.ts           # Middleware (pathname header)
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── page.tsx           # Homepage principal
│   │   ├── layout.tsx         # Layout raiz
│   │   ├── globals.css        # Estilos globais
│   │   ├── actions.ts         # Server actions da homepage
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts  # NextAuth route handler
│   │   ├── artigos/           # Rota de artigos
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts
│   │   │   └── [articleId]/
│   │   │       ├── page.tsx
│   │   │       ├── actions.ts
│   │   │       ├── loading.tsx
│   │   │       └── not-found.tsx
│   │   ├── busca/             # Página de busca
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   ├── temas/             # Páginas de temas
│   │   │   ├── page.tsx
│   │   │   └── [themeLabel]/
│   │   │       ├── page.tsx
│   │   │       └── actions.ts
│   │   └── dados-editoriais/  # Dashboard de dados
│   │       ├── page.tsx
│   │       └── actions.ts
│   │   ├── (logged-in)/       # Route group autenticado (redireciona se sem sessão)
│   │   │   ├── layout.tsx     # Guarda de autenticação
│   │   │   └── minha-conta/
│   │   │       └── clipping/
│   │   │           ├── page.tsx          # Lista de clippings
│   │   │           ├── novo/page.tsx     # Wizard de criação
│   │   │           └── [id]/editar/page.tsx  # Edição de clipping
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── telegram/
│   │       │       ├── route.ts          # Inicia vinculação Telegram
│   │       │       └── callback/route.ts # Finaliza vinculação, salva chatId
│   │       └── clipping/
│   │           ├── route.ts              # GET + POST /api/clipping
│   │           └── [id]/route.ts         # PUT + DELETE /api/clipping/[id]
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes shadcn/ui
│   │   ├── auth/
│   │   │   └── AuthButton.tsx # Botão de login/logout
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── common/
│   │   │   └── Providers.tsx  # SessionProvider + QueryClient
│   │   ├── NewsCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── ClientArticle.tsx
│   │   ├── DashboardClient.tsx
│   │   ├── ChartTooltip.tsx
│   │   └── KpiCard.tsx
│   └── lib/                   # Utilitários e helpers
│       ├── typesense-client.ts
│       ├── themes.ts
│       ├── utils.ts
│       ├── article-row.ts
│       ├── result.ts
│       ├── action-state.ts
│       └── getAgencyName.ts
├── public/                    # Assets estáticos
├── package.json
├── tsconfig.json
├── next.config.ts
├── components.json            # Config do shadcn/ui
├── biome.json                 # Config do Biome
├── Dockerfile
└── README.md
```

## Conceitos-Chave

### 1. Server Actions e Data Fetching

O projeto utiliza extensivamente Server Actions do Next.js 15 para buscar dados:

- **actions.ts**: Cada rota tem seu próprio arquivo de server actions
- **Padrão de Result**: Utiliza um tipo `Result<T>` para tratamento de erros consistente
- **Integração com Typesense**: Cliente configurado em `lib/typesense-client.ts`

Exemplo de uso:

```typescript
// Em app/actions.ts
export async function getLatestArticles() {
  // Retorna Result<ArticleRow[]>
}

// Em page.tsx
const result = await getLatestArticles();
if (result.type !== "ok") return <div>Erro...</div>;
const articles = result.data;
```

### 2. Tipos de Artigo

Estrutura principal definida em `lib/article-row.ts`:

- `unique_id`: Identificador único
- `title`: Título da notícia
- `content`: Conteúdo em texto/markdown
- `image`: URL da imagem
- `published_at`: Timestamp Unix
- `theme_1_level_1_label`: Tema principal
- `agency_slug`: Órgão/ministério responsável

### 3. Sistema de Temas

Definidos em `lib/themes.ts`:

- Mapeia temas para ícones e imagens
- Usado na página inicial e páginas de temas
- Estrutura: `{ [themeName: string]: { icon: React.Component, image: string } }`

### 4. Componentes de UI

Baseados em shadcn/ui (Radix UI):

- Configuração em `components.json`
- Componentes em `components/ui/`
- Estilos personalizados com cores do governo brasileiro

### 5. Homepage Layout

A página inicial (`app/page.tsx`) tem 5 seções principais:

1. **Hero**: 1 manchete grande + 2 cards laterais + 2 secundários sem imagem
2. **Últimas Notícias**: Grid de 6 cards com preview
3. **Temas em Foco**: 3 temas com 2 notícias cada
4. **Transparência**: Links para portais externos (Portal da Transparência, Dados Abertos, Ouvidoria)
5. **Estatísticas**: KPIs editoriais (notícias do mês, total, ministérios, etc.)

### 6. Revalidação

- **ISR**: `export const revalidate = 600` (10 minutos)
- Páginas são regeneradas em background
- Garante conteúdo atualizado sem rebuild completo

### 7. Autenticação (NextAuth v5)

O portal usa **NextAuth.js v5 (beta 30)** com suporte a dois provedores:

- **Google OAuth** — para desenvolvimento local
- **Gov.Br (OpenID Connect)** — para produção, via `sso.acesso.gov.br`

A autenticação é **opcional**: o portal é público e nenhuma rota exige login. O botão de acesso é exibido apenas quando ao menos um provedor está configurado.

**Arquivos principais:**

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/auth.ts` | Configuração central (providers, callbacks JWT/session, refresh token) |
| `src/app/api/auth/[...nextauth]/route.ts` | Route handler que expõe os endpoints do NextAuth |
| `src/components/auth/AuthButton.tsx` | Botão de login/logout no Header |
| `src/components/common/Providers.tsx` | `SessionProvider` que envolve o app |

**Fluxo de autenticação (Gov.Br):**

```
Usuário → "Entrar" → /api/auth/signin → sso.acesso.gov.br → callback → JWT criado → sessão ativa
```

O JWT armazena `accessToken`, `refreshToken` e `expiresAt`. O refresh automático é feito apenas para Gov.Br (Google gerencia sessões por conta própria).

**Escopos Gov.Br solicitados:** `openid email profile govbr_confiabilidades`

**Rota futura via Keycloak DGB:**

Quando o Keycloak interno estiver disponível, basta alterar `AUTH_GOVBR_ISSUER` para a URL do Keycloak — nenhuma mudança de código é necessária.

```
Usuário → NextAuth → Keycloak DGB (SSO) → Gov.Br (IdP externo)
```

**Vinculação Telegram (OAuth via portal):**

O bot do Telegram (`/login`) inicia o fluxo de vinculação de conta, que passa pelo portal:

```
Bot /login → token UUID → Firestore telegramAuthTokens/{state}
    → link para /api/auth/telegram?state=TOKEN
        → usuário autentica via NextAuth
            → /api/auth/telegram/callback
                → salva chatId em users/{userId}/telegramLink/account
                    → deleta token (uso único, TTL 10 min)
```

Implementação: `src/app/api/auth/telegram/route.ts` e `src/app/api/auth/telegram/callback/route.ts`.

## Comandos Principais

```bash
# Desenvolvimento
pnpm dev          # Inicia servidor dev com Turbopack

# Build
pnpm build        # Build de produção com Turbopack

# Produção
pnpm start        # Inicia servidor de produção

# Linting e Formatação
pnpm lint         # Verifica código com Biome
pnpm format       # Formata código com Biome
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha os valores:

```bash
cp .env.example .env.local
```

### Typesense (obrigatório)

```env
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY=sua-api-key
```

**Para desenvolvimento local:** o container `govbrnews-typesense` busca a chave do GCP Secret Manager na inicialização:

```bash
docker logs govbrnews-typesense | grep "API Key:"
```

### Autenticação (opcional)

```env
# Gerar com: openssl rand -base64 32
AUTH_SECRET=sua-chave-secreta

# Google OAuth (desenvolvimento)
# Redirect URI: http://localhost:3000/api/auth/callback/google
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Gov.Br OpenID Connect (produção)
# AUTH_GOVBR_ID=
# AUTH_GOVBR_SECRET=
# AUTH_GOVBR_ISSUER=https://sso.acesso.gov.br
```

- Se nenhum provedor for configurado, o `AuthButton` fica oculto automaticamente.
- `AUTH_SECRET` é obrigatório sempre que qualquer provedor for ativado.
- Em Cloud Run, adicione também `AUTH_URL=https://seu-dominio.com` para que os redirects funcionem corretamente.

## Padrões de Código

### Server Components (padrão)

As páginas em `app/` são Server Components por padrão:

```tsx
// app/page.tsx
export default async function Page() {
  const data = await fetchData(); // Direto no componente
  return <div>{data}</div>;
}
```

### Client Components

Marcados com `'use client'`:

```tsx
// components/ClientArticle.tsx
"use client";
export default function ClientArticle() {
  const [state, setState] = useState();
  // ...
}
```

### Server Actions

```tsx
// app/artigos/actions.ts
"use server";

import { Result } from "@/lib/result";

export async function getArticles(): Promise<Result<Article[]>> {
  try {
    // Busca do Typesense
    return { type: "ok", data: articles };
  } catch (error) {
    return { type: "error", error: "Mensagem de erro" };
  }
}
```

### Tratamento de Erros

Sempre use o padrão `Result<T>`:

```typescript
type Result<T> = { type: "ok"; data: T } | { type: "error"; error: string };
```

## Estilo e Design

### Cores do Governo

Definidas em `app/globals.css`:

- `--government-blue`: Azul institucional
- `--government-red`: Vermelho
- `--government-green`: Verde
- `--government-yellow`: Amarelo

### Tailwind Classes Customizadas

```css
.theme-banner-1,
.theme-banner-2,
.theme-banner-3 .transparency-banner-1,
.transparency-banner-2,
.transparency-banner-3;
```

SVGs decorativos de fundo para cards de temas e transparência.

### Responsividade

- Mobile-first
- Breakpoints padrão do Tailwind
- Grid adapta de 1 coluna (mobile) para 3 colunas (desktop)

## Integração com Typesense

Cliente configurado em `lib/typesense-client.ts`:

```typescript
import Typesense from "typesense";

const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST ?? 'localhost';
const port = 8108;
const protocol = 'http';

const client = new Typesense.Client({
  nodes: [{ host, port, protocol }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY ??
    'govbrnews_api_key_change_in_production',
  connectionTimeoutSeconds: 10,
});
```

### Busca de Artigos

```typescript
const searchResults = await client.collections("articles").documents().search({
  q: query,
  query_by: "title,content",
  sort_by: "published_at:desc",
});
```

## Componentes Importantes

### NewsCard

Card de notícia reutilizável com suporte a diferentes layouts:

- Modo principal (manchete grande com imagem)
- Modo padrão (card médio)
- Modo compacto (sem imagem)

Props principais:

- `title`, `summary`, `date`, `theme_1_level_1`
- `imageUrl`, `internalUrl`
- `isMain` (boolean para manchete principal)

### MarkdownRenderer

Renderiza conteúdo markdown dos artigos:

- Suporta HTML bruto (rehype-raw)
- GitHub Flavored Markdown (remark-gfm)
- Estilos customizados para elementos markdown

### SearchBar

Barra de busca com:

- Debounce
- Navegação para `/busca?q=termo`
- Ícone de busca (Lucide React)

### AuthButton

Botão de autenticação em `components/auth/AuthButton.tsx`:

- Consulta `/api/auth/providers` ao montar para verificar se há provedores configurados
- Se nenhum provedor estiver ativo, **não renderiza nada** (graceful degradation)
- Estado de loading: skeleton animado enquanto verifica sessão
- Não autenticado: botão "Entrar" com ícone `LogIn`
- Autenticado: avatar com iniciais do nome + dropdown com opção "Sair"
- Presente no Header tanto em desktop quanto em mobile

## Dicas para Desenvolvimento

### Adicionar Nova Página

1. Crie pasta em `src/app/`
2. Adicione `page.tsx` (Server Component)
3. Se precisar de dados, crie `actions.ts` com server actions
4. Adicione `loading.tsx` para estado de carregamento (opcional)
5. Adicione `error.tsx` para tratamento de erros (opcional)

### Adicionar Novo Componente UI

```bash
npx shadcn-ui@latest add [component-name]
```

Componentes são adicionados automaticamente em `components/ui/`

### Trabalhar com Temas

1. Adicione tema em `lib/themes.ts`
2. Importe ícone do lucide-react
3. Adicione imagem em `public/`
4. Use em componentes via `THEME_ICONS[themeName]`

### Debugging do Typesense

- Verifique conexão: `console.log(await client.health.retrieve())`
- Liste collections: `console.log(await client.collections().retrieve())`
- Teste queries manualmente antes de integrar

### Performance

- Use `loading.tsx` para Suspense boundaries
- Implemente paginação em listas longas
- Otimize imagens (Next.js Image component quando possível)
- Mantenha revalidação adequada (nem muito curta, nem muito longa)

## Deployment

O projeto está configurado para deploy standalone:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Com Docker

```bash
docker build -t portal-brasil .
docker run -p 3000:3000 portal-brasil
```

### Variáveis de Ambiente em Produção

Certifique-se de configurar:

- `NEXT_PUBLIC_TYPESENSE_HOST`
- `NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY`
- `AUTH_SECRET` (obrigatório se qualquer provedor de auth estiver ativo)
- `AUTH_URL` (URL pública do app, ex: `https://portal.exemplo.gov.br`) — necessário para Cloud Run pois o `trustHost: true` não infere a URL base automaticamente em todos os cenários
- `AUTH_GOVBR_ID`, `AUTH_GOVBR_SECRET`, `AUTH_GOVBR_ISSUER` (para Gov.Br em produção)

## Deployment Gotchas

### 1. Edge Runtime — nunca importar módulos Node.js em `auth.ts`

`src/auth.ts` é importado por `middleware.ts`, que roda no **Edge Runtime** do Next.js. Módulos Node.js (como `firebase-admin`) **não podem** ser importados estaticamente. Use `await import()` (dynamic import) dentro de callbacks.

### 2. CI/CD prod/staging só atualiza a imagem Docker

Os workflows `deploy-production.yml` e `deploy-staging.yml` usam apenas `gcloud run services update --image`. Variáveis de ambiente são gerenciadas pelo **Terraform** no repo `destaquesgovbr/infra` (`terraform/portal.tf`). Nunca use `--set-env-vars` nos deploys de prod/staging.

### 3. Preview deploys DEFINEM env vars no workflow

`deploy-preview.yml` e `deploy-preview-update.yml` usam `--set-env-vars` porque serviços de preview **não são gerenciados pelo Terraform**. Ambos os workflows devem ser mantidos em sincronia.

### 4. Keycloak redirect URIs — wildcard só funciona como sufixo

No Keycloak, `*` só funciona como **sufixo** (prefix match). Exemplo: `https://portal-preview-*` funciona, mas `https://portal-preview-*-990583792367...` **NÃO** funciona.

### 5. `signIn()` precisa de provider explícito

`signIn(undefined)` exibe a página de signin padrão do NextAuth. Sempre busque `/api/auth/providers` e passe o ID do provider explicitamente.

## Troubleshooting Comum

### Erros de Build com Turbopack

- Limpe cache: `rm -rf .next`
- Reinstale dependências: `rm -rf node_modules && pnpm install`

### Erros de Typesense

- Verifique se o servidor está acessível
- Confirme API key
- Verifique se a collection existe
- Use try/catch e retorne Result<T>

### Problemas de Estilo

- Rode `pnpm format` para consistência
- Verifique imports do Tailwind em `globals.css`
- Limpe cache do navegador

### TypeScript Errors

- Rode `npx tsc --noEmit` para ver todos os erros
- Verifique tipos em `lib/article-row.ts`
- Use `Result<T>` consistentemente

### Erros de Autenticação

**Sessão não persiste / redirect incorreto em produção:**
- Confirme que `AUTH_URL` está definida com a URL pública do Cloud Run
- Confirme que `AUTH_SECRET` está configurado como secret no workflow de deploy

**`AUTH_SECRET` ausente:**
- NextAuth lança erro na inicialização; gere com `openssl rand -base64 32`

**Gov.Br: erro de redirect_uri:**
- O redirect URI registrado no Gov.Br deve ser `https://seu-dominio/api/auth/callback/govbr`
- Em preview deploys, cada URL de preview precisa ser adicionada ao Gov.Br ou usada com Google OAuth

**AuthButton não aparece:**
- Verifique se `AUTH_GOOGLE_ID` ou `AUTH_GOVBR_ID` está definido no `.env.local`
- O componente se oculta quando `/api/auth/providers` retorna objeto vazio

## Área Logada (`(logged-in)`)

Route group protegido por autenticação. O layout em `src/app/(logged-in)/layout.tsx` redireciona para `/api/auth/signin` se não houver sessão.

### Páginas disponíveis

- `/minha-conta/clipping` — Lista de clippings do usuário
- `/minha-conta/clipping/novo` — Wizard de criação de clipping (4 passos)
- `/minha-conta/clipping/[id]/editar` — Edição de clipping existente

### Componentes (`src/components/clipping/`)

| Componente | Propósito |
|------------|-----------|
| `ClippingWizard` | Wizard 4 passos: Recortes → Prompt → Horário → Canais |
| `RecorteEditor` | Editor de um Recorte com tema, agência e keywords |
| `ScheduleSelect` | Select com 48 horários (00:00–23:30 de 30 em 30 min) |
| `PromptEditor` | Textarea com prompt LLM, contador de chars, botão restaurar |
| `ChannelSelector` | Checkboxes email/telegram/push |
| `ClippingCard` | Card na listagem com ações de editar/excluir/toggle |

### Tipos (`src/types/clipping.ts`)

- `Recorte` — filtro composto: `{ id, themes, agencies, keywords }`
- `Clipping` — configuração completa com `recortes[]`, `scheduleTime`, `deliveryChannels`, `prompt`
- `ClippingPayload` — payload para criação/atualização

## Clipping APIs

### CRUD de Clippings

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/clipping` | Required | Lista clippings do usuário |
| POST | `/api/clipping` | Required | Cria novo clipping (max 10) |
| PUT | `/api/clipping/[id]` | Required | Atualiza clipping |
| DELETE | `/api/clipping/[id]` | Required | Remove clipping |

Validação: `ClippingPayloadSchema` em `src/lib/clipping-validation.ts`
Persistência: Firestore `users/{userId}/clippings/{clippingId}`

### Vinculação Telegram

| Method | Path | Descrição |
|--------|------|-----------|
| GET | `/api/auth/telegram?state=TOKEN` | Inicia vinculação (precisa de sessão) |
| GET | `/api/auth/telegram/callback?state=TOKEN` | Finaliza vinculação, salva chatId |

Fluxo: Bot `/login` → token Firestore → portal auth → callback → `users/{userId}/telegramLink/account`

## Links Úteis

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Typesense Docs](https://typesense.org/docs/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [NextAuth.js v5 Docs](https://authjs.dev/)
- [Gov.Br SSO — Documentação](https://manual-roteiro-integracao-login-unico.servicos.gov.br/)

## Convenções do Projeto

### Nomenclatura

- Componentes: PascalCase (`NewsCard.tsx`)
- Utilitários: camelCase (`getAgencyName.ts`)
- Server Actions: camelCase (`getLatestArticles`)
- CSS Classes: kebab-case (`theme-banner-1`)

### Estrutura de Imports

```typescript
// 1. React/Next
import { useState } from "react";
import Link from "next/link";

// 2. Bibliotecas externas
import { useQuery } from "@tanstack/react-query";

// 3. Componentes internos
import { Button } from "@/components/ui/button";
import NewsCard from "@/components/NewsCard";

// 4. Utilitários e tipos
import { getExcerpt } from "@/lib/utils";
import type { ArticleRow } from "@/lib/article-row";
```

### Comentários

Use comentários descritivos para seções da página:

```tsx
{
  /* 1️⃣ HERO — destaque principal */
}
{
  /* 2️⃣ ÚLTIMAS NOTÍCIAS — grade */
}
```

### Git Flow

- **Branches**: `main` (produção) ← `development` (staging) ← `feat/*` (features)
- **PRs**: Sempre direcionar para `development` primeiro (staging). Após validação, merge de `development` → `main` para produção.

### Git Commits

- **Idioma**: Português
- **Prefixos**: `feature:`, `fix:`, `refactor:`, `docs:`, `chore:`
- **NÃO incluir** `Co-Authored-By` nas mensagens de commit
- Usar descrição concisa na primeira linha
- Detalhar mudanças em bullet points quando necessário

Exemplo:
```
feature: implementa analytics tracking com Umami

- Adiciona integração com Umami Analytics
- Cria hook useUmamiTrack para eventos customizados
- Rastreia cliques em artigos com origem

```

## Contribuindo

Este projeto utiliza Biome para linting e formatação. Antes de commitar:

```bash
pnpm lint    # Verifica erros
pnpm format  # Formata código
```

---

**Última atualização**: Março 2026
**Mantido por**: Equipe MGI/Governo Federal
