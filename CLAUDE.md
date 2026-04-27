# Portal Destaques Gov.br - Guia para Claude

## Visão Geral do Projeto

Plataforma do Governo Federal brasileiro ("Web Difusora") desenvolvida com Next.js 15, que agrega conteúdo de diversos ministérios e órgãos governamentais e oferece clippings automatizados por IA, marketplace de clippings, widgets embarcáveis, notificações push e feeds RSS/Atom/JSON. O projeto utiliza Typesense para busca e indexação de artigos.

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
- **A/B Testing**: GrowthBook SDK
- **Analytics**: Umami (privacy-first) + Microsoft Clarity (heatmaps)
- **Linting/Formatting**: Biome 2.2.0

### Backend/Dados

- **Busca**: Typesense 2.1.0
- **Persistência**: Firebase/Firestore (clippings, usuários, convites)
- **Email**: SendGrid (notificações de clipping e waitlist)
- **Pub/Sub**: Google Cloud Pub/Sub (execução de clippings)
- **Revalidação**: ISR (Incremental Static Regeneration) a cada 10 minutos

### Ferramentas de Build

- **Package Manager**: pnpm
- **Build Tool**: Next.js Turbopack
- **Container**: Docker (Dockerfile presente)
- **Testes**: Vitest (unitários) + Playwright (E2E)

## Estrutura de Diretórios

```
/portal
├── src/
│   ├── auth.ts                    # Configuração central do NextAuth
│   ├── middleware.ts              # Middleware (pathname header)
│   ├── ab-testing/                # Integração GrowthBook (A/B testing + feature flags)
│   │   ├── index.ts               # Exports públicos do módulo
│   │   ├── GrowthBookProvider.tsx  # Provider do GrowthBook
│   │   ├── growthbook.ts          # Configuração do SDK
│   │   ├── hooks.ts               # useAB, useFeatureFlag, useIsVariant
│   │   ├── tracking.ts            # Tracking de experimentos
│   │   └── components/
│   │       └── ABDebugPanel.tsx    # Painel de debug para A/B tests
│   ├── config/                    # Configurações de negócio
│   │   ├── prioritization.ts      # Lógica de priorização de conteúdo
│   │   ├── prioritization-config.ts
│   │   ├── prioritization.yaml
│   │   ├── widget-presets.ts      # Presets de widgets
│   │   ├── themes.yaml            # Definição de temas (YAML)
│   │   ├── agencies.yaml          # Definição de agências (YAML)
│   │   └── hierarchy.yaml         # Hierarquia tema/agência
│   ├── data/                      # Dados e utilitários de dados
│   │   ├── agencies-utils.ts
│   │   ├── agency-groups.ts
│   │   ├── themes.ts
│   │   └── themes-utils.ts
│   ├── hooks/                     # Custom React hooks
│   │   └── useRecorteEstimation.ts
│   ├── services/                  # Camada de serviços
│   │   ├── typesense/client.ts    # Cliente Typesense
│   │   └── embeddings/client.ts   # Cliente da API de embeddings
│   ├── types/                     # Definições de tipos
│   │   ├── article.ts             # ArticleRow
│   │   ├── clipping.ts            # Clipping, Recorte, Release, MarketplaceListing
│   │   ├── search.ts              # Tipos de busca
│   │   ├── analytics.ts           # Tipos de analytics
│   │   ├── invite.ts              # Tipos de convite
│   │   ├── widget.ts              # Tipos de widget
│   │   ├── action-state.ts        # Estado de server actions
│   │   └── next-auth.d.ts         # Extensões de tipos NextAuth
│   ├── app/                       # App Router (Next.js 15)
│   │   ├── layout.tsx             # Layout raiz
│   │   ├── globals.css            # Estilos globais
│   │   ├── not-found.tsx          # Página 404
│   │   ├── feed.xml/route.ts      # Feed RSS
│   │   ├── feed.json/route.ts     # Feed JSON
│   │   ├── feed.atom/route.ts     # Feed Atom
│   │   ├── (public)/              # Route group público
│   │   │   ├── page.tsx           # Landing institucional (homepage)
│   │   │   ├── noticias/          # Feed de notícias
│   │   │   ├── artigos/[articleId]/ # Detalhe de artigo
│   │   │   ├── busca/             # Página de busca
│   │   │   ├── temas/             # Listagem e detalhe de temas
│   │   │   ├── orgaos/            # Listagem e detalhe de órgãos
│   │   │   ├── clippings/         # Galeria de Clippings (marketplace)
│   │   │   ├── integracao/        # Página de integração (API/MCP/Chat)
│   │   │   ├── feeds/             # Listagem de feeds disponíveis
│   │   │   ├── widgets/configurador/ # Configurador de widgets
│   │   │   ├── transparencia-algoritmica/ # Transparência algorítmica
│   │   │   ├── web-difusora/      # Demo Web Difusora
│   │   │   ├── convite/           # Fluxo de convites
│   │   │   ├── convites/          # Listagem de convites
│   │   │   └── lista-espera/      # Cadastro na lista de espera
│   │   ├── (logged-in)/           # Route group autenticado
│   │   │   ├── layout.tsx         # Guarda de autenticação
│   │   │   └── minha-conta/clipping/
│   │   │       ├── page.tsx       # Lista de clippings do usuário
│   │   │       ├── novo/page.tsx  # Wizard de criação
│   │   │       ├── [id]/page.tsx  # Detalhe do clipping
│   │   │       └── [id]/editar/page.tsx # Edição de clipping
│   │   ├── (admin)/               # Route group de administração
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── convites/      # Gerenciamento de convites
│   │   │       └── preview/       # Preview admin
│   │   ├── (analytics)/           # Route group de analytics
│   │   │   └── dados-editoriais/  # Dashboard editorial
│   │   ├── (widget-embed)/        # Route group para embedding
│   │   │   ├── layout.tsx
│   │   │   └── embed/             # Widget embed (iframe)
│   │   ├── clipping/release/[releaseId]/ # Visualização de releases
│   │   ├── auth/                  # Páginas pós-login e Telegram
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── telegram/      # Vinculação Telegram
│   │       ├── clipping/          # CRUD de clippings
│   │       │   ├── route.ts       # GET + POST
│   │       │   ├── estimate/      # Estimativa de recorte
│   │       │   ├── generate-recortes/ # Geração IA de recortes
│   │       │   └── [id]/
│   │       │       ├── route.ts   # PUT + DELETE
│   │       │       ├── releases/  # Releases do clipping
│   │       │       └── send/      # Envio manual
│   │       ├── clippings/         # APIs do marketplace
│   │       │   ├── publish/       # Publicação
│   │       │   └── public/        # Listagem/detalhe público
│   │       │       └── [listingId]/
│   │       │           ├── follow/ # Seguir
│   │       │           ├── like/   # Curtir
│   │       │           ├── clone/  # Clonar
│   │       │           ├── releases/
│   │       │           ├── feed.json/
│   │       │           └── feed.xml/
│   │       ├── push/              # Push notifications
│   │       └── widgets/           # APIs de widgets
│   ├── components/                # Componentes React
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   ├── layout/                # Header, Footer, Portal, ZenMode
│   │   ├── landing/               # Componentes da landing page
│   │   │   ├── LandingHero.tsx
│   │   │   ├── LandingSection.tsx
│   │   │   ├── FeatureCard.tsx
│   │   │   ├── PainPointGrid.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── ShowcaseMockup.tsx
│   │   │   ├── CalloutAnnotation.tsx
│   │   │   └── FlowBadge.tsx
│   │   ├── articles/              # NewsCard, ClientArticle, filtros, carousel, video
│   │   ├── search/                # SearchBar
│   │   ├── clipping/              # Wizard, editors, badges, release list
│   │   ├── marketplace/           # MarketplaceCard, Follow, Publish, ListingActions
│   │   ├── filters/               # Multi-selects de agência/tema
│   │   ├── dashboard/             # DashboardClient, KpiCard, ChartTooltip
│   │   ├── analytics/             # UmamiScript, ClarityScript, useUmamiTrack
│   │   ├── push/                  # PushSubscriber, ServiceWorkerRegistrar
│   │   ├── widgets/               # Widget container, carousel, configurador
│   │   ├── auth/                  # AuthButton
│   │   ├── invite/                # InviteLanding, InviteList, InviteCodeInput
│   │   ├── waitlist/              # WaitlistForm
│   │   ├── admin/                 # InviteStatsCards, WaitlistManager
│   │   ├── consent/               # ConsentProvider, CookieConsent
│   │   └── common/                # Providers, MarkdownRenderer, FeedLink
│   └── lib/                       # Utilitários e helpers
│       ├── utils.ts
│       ├── result.ts
│       ├── clipping-validation.ts
│       ├── clipping-worker.ts
│       ├── recorte-utils.ts
│       ├── recorte-preview-url.ts
│       ├── estimate-recorte-count.ts
│       ├── feed.ts
│       ├── feed-handler.ts
│       ├── marketplace-feed.ts
│       ├── release-utils.ts
│       ├── email.ts
│       ├── email-templates.ts
│       ├── markdown-carousel.ts
│       ├── markdown-to-html.ts
│       ├── firebase-admin.ts
│       ├── pubsub.ts
│       ├── admin.ts
│       ├── invite.ts
│       ├── normalize-email.ts
│       ├── resolve-stable-user-id.ts
│       ├── cron-utils.ts
│       ├── push-utils.ts
│       ├── widget-utils.ts
│       └── landing-stats.ts
├── e2e/                           # Testes E2E com Playwright
├── public/                        # Assets estáticos
├── package.json
├── tsconfig.json
├── next.config.ts
├── components.json                # Config do shadcn/ui
├── biome.json                     # Config do Biome
├── vitest.config.ts               # Config do Vitest
├── playwright.config.ts           # Config do Playwright
├── Dockerfile
└── README.md
```

## Conceitos-Chave

### 1. Server Actions e Data Fetching

O projeto utiliza extensivamente Server Actions do Next.js 15 para buscar dados:

- **actions.ts**: Cada rota tem seu próprio arquivo de server actions
- **Padrão de Result**: Utiliza um tipo `Result<T>` para tratamento de erros consistente
- **Integração com Typesense**: Cliente configurado em `services/typesense/client.ts`

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

Estrutura principal definida em `types/article.ts`:

- `unique_id`: Identificador único
- `title`: Título da notícia
- `content`: Conteúdo em texto/markdown
- `image`: URL da imagem
- `published_at`: Timestamp Unix
- `theme_1_level_1_label`: Tema principal
- `agency`: Órgão/ministério responsável

### 3. Sistema de Temas e Agências

Definidos em YAML em `config/themes.yaml` e `config/agencies.yaml`, com utilitários em `data/themes.ts` e `data/agencies-utils.ts`. A hierarquia temática é definida em `config/hierarchy.yaml`.

### 4. Componentes de UI

Baseados em shadcn/ui (Radix UI):

- Configuração em `components.json`
- Componentes em `components/ui/`
- Estilos personalizados com cores do governo brasileiro

### 5. Homepage (Landing Institucional)

A homepage (`app/(public)/page.tsx`) é uma landing page institucional ("Web Difusora") com as seguintes seções:

1. **Hero**: Apresentação da plataforma com mockup visual (Clipping + Panorama + notificação)
2. **Pain Points**: Grid de problemas que a plataforma resolve
3. **Três Fluxos**: Difusão, Inteligência e Integração
4. **Feature Grid**: 9 funcionalidades (Clipping, Widgets, WebPush, Feeds, Busca, Panorama, Chat, MCP, GraphQL)
5. **Web Difusora Showcase**: Teaser da funcionalidade de difusão
6. **Roadmap**: Linha do tempo das próximas entregas
7. **Transparência**: Prova de transparência com estatísticas do índice
8. **CTA Final**: Call-to-action para cadastro/uso

A rota `/noticias` contém o feed de notícias que anteriormente era a homepage.

Componentes da landing ficam em `components/landing/` (LandingHero, LandingSection, FeatureCard, PainPointGrid, StatsBar, ShowcaseMockup, CalloutAnnotation, FlowBadge).

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

### GrowthBook — A/B Testing e Feature Flags (opcional)

```env
NEXT_PUBLIC_GROWTHBOOK_API_HOST=https://cdn.growthbook.io
NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=sdk-xxxxx
```

Se não configurado, features usam valores padrão. O módulo `src/ab-testing/` exporta hooks (`useAB`, `useFeatureFlag`, `useIsVariant`) e componentes (`ABDebugPanel`, `GrowthBookProvider`).

### Analytics (opcional)

```env
# Umami — privacy-first
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami-instance.com/script.js

# Microsoft Clarity — heatmaps e gravação de sessão
NEXT_PUBLIC_CLARITY_PROJECT_ID=
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

### Admin e Email (opcional)

```env
# Controle de acesso admin (lista de emails separados por vírgula)
ADMIN_EMAILS=

# SendGrid — notificações de clipping e waitlist
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=noreply@destaquesgovbr.gov.br
```

### Busca Semântica (opcional)

```env
EMBEDDINGS_API_URL=
EMBEDDINGS_API_KEY=
```

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

Cliente configurado em `services/typesense/client.ts`:

```typescript
import Typesense from 'typesense'

const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST ?? 'localhost'
const port = Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT ?? '8108')
const protocol = process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL ?? 'http'

export const typesense = new Typesense.Client({
  nodes: [{ host, port, protocol }],
  apiKey:
    process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY ??
    'govbrnews_api_key_change_in_production',
  connectionTimeoutSeconds: 10,
})
```

O portal também suporta **busca semântica/híbrida** via `services/embeddings/client.ts`, que usa a API de embeddings para gerar vetores de busca. A busca híbrida combina keyword + semântica com `alpha` configurável.

### Busca de Artigos

```typescript
const searchResults = await typesense.collections("articles").documents().search({
  q: query,
  query_by: "title,content",
  sort_by: "published_at:desc",
});
```

## Componentes Importantes

### NewsCard (`components/articles/NewsCard.tsx`)

Card de notícia reutilizável com suporte a diferentes layouts:

- Modo principal (manchete grande com imagem)
- Modo padrão (card médio)
- Modo compacto (sem imagem)

### MarkdownRenderer (`components/common/MarkdownRenderer.tsx`)

Renderiza conteúdo markdown dos artigos com suporte a HTML bruto (rehype-raw), GFM (remark-gfm), e carrosséis de imagem via `lib/markdown-carousel.ts`.

### SearchBar (`components/search/SearchBar.tsx`)

Barra de busca com debounce e navegação para `/busca?q=termo`.

### AuthButton (`components/auth/AuthButton.tsx`)

Botão de autenticação — consulta `/api/auth/providers` e se oculta se nenhum provedor está configurado.

### ClippingWizard (`components/clipping/ClippingWizard.tsx`)

Wizard de criação de clipping em 4 passos: Recortes → Prompt → Horário → Canais.

### ClippingDetailView (`components/clipping/ClippingDetailView.tsx`)

Componente unificado para exibição de detalhes de clipping, usado tanto na área logada quanto na visualização pública do marketplace. Renderiza o digest (conteúdo markdown da release) e metadados do clipping.

### Galeria de Clippings (`app/(public)/clippings/page.tsx`)

Marketplace público de clippings — permite descobrir, seguir, curtir e clonar clippings criados pela comunidade. Componentes do marketplace ficam em `components/marketplace/`.

### Widgets (`components/widgets/`)

Sistema de widgets embarcáveis que permite que sites externos exibam notícias do portal via iframe. Inclui configurador visual (`widgets/configurador/`) e endpoint `/embed`.

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

1. Adicione tema em `config/themes.yaml`
2. Use utilitários de `data/themes.ts` e `data/themes-utils.ts`
3. Para agências: `config/agencies.yaml` + `data/agencies-utils.ts`

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
- `NEXT_PUBLIC_GROWTHBOOK_API_HOST`, `NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY` (para A/B testing)
- `SENDGRID_API_KEY`, `EMAIL_FROM_ADDRESS` (para envio de clippings e notificações)
- `ADMIN_EMAILS` (controle de acesso admin)

## Security Headers

Configurados em `next.config.ts` via `headers()`. Aplicados globalmente a todas as rotas (`/(.*)`).

| Header | Valor | Propósito |
|--------|-------|-----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS por 2 anos |
| `X-Frame-Options` | `DENY` | Previne clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla vazamento de Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Restringe APIs do navegador |
| `Content-Security-Policy` | Política restritiva (ver `next.config.ts`) | Previne XSS e injeção de conteúdo |

**Exceção**: A rota `/embed` sobrescreve `X-Frame-Options` (ALLOWALL) e `Content-Security-Policy` (`frame-ancestors *`) para permitir embedding em iframes de terceiros.

**CSP dinâmico**: Os hosts de Umami (`NEXT_PUBLIC_UMAMI_SCRIPT_URL`) e GrowthBook (`NEXT_PUBLIC_GROWTHBOOK_API_HOST`) são incluídos automaticamente no CSP quando configurados via env vars.

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
- Verifique tipos em `types/article.ts` e `types/clipping.ts`
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
- `/minha-conta/clipping/novo` — Wizard de criação de clipping
- `/minha-conta/clipping/[id]` — Detalhe do clipping (com releases e digest markdown)
- `/minha-conta/clipping/[id]/editar` — Edição de clipping existente

### Componentes (`src/components/clipping/`)

| Componente | Propósito |
|------------|-----------|
| `ClippingWizard` | Wizard 4 passos: Recortes → Prompt → Horário → Canais |
| `ClippingDetailView` | Visualização unificada de detalhe de clipping |
| `RecorteEditor` | Editor de um Recorte com tema, agência e keywords |
| `CronScheduleBuilder` | Construtor visual de agendamento cron |
| `ScheduleSelect` | Select com horários pré-definidos |
| `PromptEditor` | Textarea com prompt LLM, contador de chars, botão restaurar |
| `ChannelSelector` | Checkboxes email/telegram/push/webhook |
| `ExtraEmailsInput` | Input para emails adicionais de entrega |
| `ClippingCard` | Card na listagem com ações de editar/excluir/toggle |
| `ReleaseList` | Lista de releases (edições) do clipping |
| `RecorteEstimationBadge` | Badge com estimativa de artigos por recorte |
| `ArticleCountBadge` | Badge com contagem de artigos |
| `AgentRecorteGenerator` | Gerador de recortes via IA |

### Tipos (`src/types/clipping.ts`)

- `Recorte` — filtro composto: `{ id, title, themes, agencies, keywords }`
- `Clipping` — configuração completa com `recortes[]`, `schedule`, `deliveryChannels`, `prompt`, campos de marketplace
- `ClippingPayload` — payload para criação/atualização
- `Release` — edição gerada do clipping: `{ id, digest, digestHtml, articlesCount, createdAt }`
- `MarketplaceListing` — listagem pública no marketplace
- `MarketplaceFollower` — seguidor de uma listagem
- `Subscription` — assinatura de um clipping

## Clipping APIs

### CRUD de Clippings

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/clipping` | Required | Lista clippings do usuário |
| POST | `/api/clipping` | Required | Cria novo clipping |
| PUT | `/api/clipping/[id]` | Required | Atualiza clipping |
| DELETE | `/api/clipping/[id]` | Required | Remove clipping |
| GET | `/api/clipping/[id]/releases` | Required | Lista releases do clipping |
| POST | `/api/clipping/[id]/send` | Required | Envia clipping manualmente |
| POST | `/api/clipping/estimate` | Required | Estimativa de artigos por recorte |
| POST | `/api/clipping/generate-recortes` | Required | Geração de recortes via IA |

Validação: `ClippingPayloadSchema` em `src/lib/clipping-validation.ts`
Persistência: Firestore `users/{userId}/clippings/{clippingId}`

### Marketplace APIs

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/clippings/publish` | Required | Publica clipping no marketplace |
| GET | `/api/clippings/public` | — | Lista clippings públicos |
| GET | `/api/clippings/public/[listingId]` | — | Detalhe de listagem pública |
| POST | `/api/clippings/public/[listingId]/follow` | Required | Seguir clipping |
| POST | `/api/clippings/public/[listingId]/like` | Required | Curtir clipping |
| POST | `/api/clippings/public/[listingId]/clone` | Required | Clonar clipping |
| GET | `/api/clippings/public/[listingId]/releases` | — | Releases da listagem |
| GET | `/api/clippings/public/[listingId]/feed.json` | — | Feed JSON da listagem |
| GET | `/api/clippings/public/[listingId]/feed.xml` | — | Feed RSS da listagem |

### Vinculação Telegram

| Method | Path | Descrição |
|--------|------|-----------|
| GET | `/api/auth/telegram?state=TOKEN` | Inicia vinculação (precisa de sessão) |
| GET | `/api/auth/telegram/callback?state=TOKEN` | Finaliza vinculação, salva chatId |

Fluxo: Bot `/login` → token Firestore → portal auth → callback → `users/{userId}/telegramLink/account`

### Push Notifications

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/push/filters-data` | — | Dados de filtros para push |
| GET/PUT | `/api/push/preferences` | Required | Preferências de push do usuário |
| POST | `/api/push/sync` | — | Sincronização de subscription |

### Widgets

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/widgets/articles` | — | Artigos para widget |
| GET | `/api/widgets/config` | — | Configuração do widget |

## Área Admin (`(admin)`)

Route group protegido para administradores. Acesso controlado por `ADMIN_EMAILS`.

- `/admin/convites` — Gerenciamento de convites e lista de espera
- `/admin/preview` — Preview de funcionalidades

## Feeds e Conteúdo Público

O portal disponibiliza feeds nos formatos RSS, Atom e JSON:

- `/feed.xml` — Feed RSS global
- `/feed.atom` — Feed Atom global
- `/feed.json` — Feed JSON global
- `/api/clippings/public/[listingId]/feed.xml` — Feed RSS de clipping público
- `/api/clippings/public/[listingId]/feed.json` — Feed JSON de clipping público

A página `/feeds` lista todos os feeds disponíveis.

## Sistema de Convites e Lista de Espera

O portal possui um sistema de acesso por convite:

- `/convite` — Landing de convite
- `/convite/[code]` — Detalhe de convite específico
- `/convite/[code]/redeem` — Resgate de convite
- `/lista-espera` — Cadastro na lista de espera
- Componentes: `InviteLanding`, `InviteList`, `InviteCodeInput`, `GenerateInviteButton`
- Utilitários: `lib/invite.ts`

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

**Última atualização**: Abril 2026
**Mantido por**: Equipe MGI/Governo Federal
