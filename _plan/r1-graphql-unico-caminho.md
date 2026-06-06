# Plano — Concluir a migração GraphQL: GraphQL como único caminho (portal)

## Context

O portal "Destaques Gov.BR" ainda não foi lançado (sem usuários). A migração GraphQL (RUNBOOK-R1) já está em produção, porém **dark** (atrás de 5 feature flags `graphql.*` no GrowthBook). O objetivo agora é **concluir a migração da forma mais ágil**: tornar o GraphQL o **único caminho** e remover o gating de flags + o fallback REST.

Dois bloqueios/descobertas mudaram o plano original (flipar as flags no GrowthBook):

1. **GrowthBook está fora para escrita/leitura de flags.** A `growthbook-api` não fala de forma confiável com o MongoDB Atlas (`MongoPoolClearedError`, `/api/v1/*` → 504). Logo, ativar flags por lá é inviável e frágil. Remover a dependência do GrowthBook para esta migração é o caminho robusto.

2. **push e widgets nunca foram conectados ao GraphQL na UI.** As fachadas `services/push` e `services/widgets` existem e são testadas, mas os componentes reais usam REST direto:
   - `PushSubscriber.tsx` chama `fetch('/api/push/...')` (4 chamadas) + 2 chamadas ao `PUSH_WORKER_URL` (subscribe/unsubscribe — serviço separado).
   - `WidgetFilters.tsx` chama `fetch('/api/widgets/config')`.
   - O embed (`/embed`) busca artigos via Server Action → Typesense (`queryArticles`), sem fachada/REST.
   - As flags `graphql.push`/`graphql.widgets` não faziam nada no app rodando.

Decisão do usuário: **ligar push/widgets ao GraphQL agora** e remover o REST de todos os 5. Implementar **localmente com subagentes em paralelo** onde possível.

**Resultado pretendido:** GraphQL é a única fonte de dados para clippings, marketplace, agent, push e widgets; flags e fallback REST removidos; sem dependência do GrowthBook quebrado; tudo validado localmente (lint/tsc/vitest/codegen/build) + E2E staging + checagem manual no browser de push/widgets/embed.

**CORS desbloqueado:** `graphql-api/app.py` JÁ tem `CORSMiddleware` (`allow_origins` default `*`, métodos GET/POST/OPTIONS, header `Authorization`). O comentário "sem CORS" em `queries/widgets.ts` é obsoleto. Não há mudança no graphql-api (schema cobre push e widgets; CORS ok). **PR é portal-only.**

Constraints: `--project=inspire-7-finep`; nunca `terraform apply` local; commits PT-BR sem `Co-Authored-By`; sem `--no-verify`; **fluxo portal `feat/* → development`** (nunca direto em `main`). Branch já criada: `refactor/r1-graphql-sole-path`.

---

## Escopo

**Dentro:**
- Remover gating de flag e fallback REST tornando GraphQL incondicional em: clipping, marketplace, agent (já wired) e push, widgets (wiring novo).
- Deletar as implementações REST das fachadas (`services/*/rest.ts`) e o agente REST.
- Remover a infra de flags da migração (`GRAPHQL_FLAGS`, `feature-flags-server.ts`), **mantendo** o GrowthBook genérico (`src/ab-testing/`, `useFeatureFlag`/`getFeatureFlag` genéricos) para A/B futuro.

**Fora (documentado, não tocar):**
- Rotas REST `src/app/api/clipping*`, `/api/clippings/*`, `/api/push/*`, `/api/widgets/*` — ficam (feeds RSS/JSON e possíveis consumidores externos dependem; são camada independente). Apenas deixam de ser chamadas pelo portal.
- As 2 chamadas a `PUSH_WORKER_URL` (subscribe/unsubscribe) no `PushSubscriber` — serviço push-worker, não coberto pela fachada GraphQL.
- SSR Firestore-direto nas outras superfícies (clipping `[id]`, galeria pública, `[listingId]`) — nunca foram flag-gated; migração de SSR dessas páginas é follow-up (R1-02 diferido).
- GrowthBook genérico e qualquer fix de infra do Mongo (separado).

---

## Execução: 3 streams paralelos (subagentes), arquivos disjuntos

Os conjuntos de arquivos são disjuntos → 3 subagentes editam em paralelo no mesmo working tree sem conflito. **Subagentes apenas editam seus arquivos e reportam — NÃO commitam, NÃO rodam git, NÃO rodam biome/lint global.** O orquestrador valida e commita ao final.

### Stream A — Push
**Arquivos:** `src/services/push/{index,graphql,types}.ts`, **deletar** `src/services/push/rest.ts`, `src/components/push/PushSubscriber.tsx`, `src/services/push/__tests__/*`, `src/components/push/__tests__/PushSubscriber.test.tsx`.
- Mover os tipos `PushPreferences` e `PushSubscriptionPayload` de `rest.ts` → `types.ts` (o `index.ts` os re-exporta; `rest.ts` será deletado). Deletar `rest.ts`.
- Simplificar a fachada (`index.ts`): remover `useGraphQL`/`fetchImpl` e o branch REST. Funções sempre GraphQL via `resolveClient(client)` (default `getClient()`). Assinaturas: `getPushPreferences(client?)`, `updatePushPreferences(prefs, client?)`, `syncPushSubscription(sub, client?)`, `getPushFiltersData(client?)`. **Não** marcar `index.ts` como `'use client'`.
- `PushSubscriber.tsx` (`'use client'`): substituir as 4 chamadas a `/api/push/*` pelas funções da fachada (auth automática via `getClient()` → `getBrowserSessionToken`). **Manter** as 2 chamadas a `PUSH_WORKER_URL`. Preservar loading/error/localStorage existentes.
- Tests: fachada só-GraphQL; `PushSubscriber.test.tsx` passa a mockar `@/services/push` em vez de `fetch`.

### Stream B — Widgets
**Arquivos:** `src/services/widgets/{index,graphql,types}.ts`, **deletar** `src/services/widgets/rest.ts`, `src/components/widgets/configurator/WidgetFilters.tsx`, `src/app/(widget-embed)/embed/actions.ts`, `src/services/widgets/__tests__/*`.
- Simplificar a fachada: remover `useGraphQL`/`fetchImpl`/branch REST; sempre GraphQL via `resolveClient(client)`. `getWidgetConfig(client?)`, `getWidgetArticles(filter, client?)`. **Não** `'use client'` (embed Server Action precisa importar). Deletar `rest.ts` (não usado). Tipos já vivem em `types.ts`.
- `WidgetFilters.tsx` (`'use client'`): trocar `fetch('/api/widgets/config')` por `getWidgetConfig()` (browser, público; `getClient()` envia sem `Authorization`). Adicionar tratamento de erro.
- `embed/actions.ts` (`'use server'`): em `fetchWidgetArticles`, trocar `queryArticles` (Typesense) por `getWidgetArticles({agencies, themes, limit: articlesPerPage, page: 1}, createSSRClient())` (server→server, sem CORS). **Risco principal:** o resolver retorna artigos camelCase (`uniqueId`, `publishedAt`, …) e o embed/`WidgetNewsCard` consome `ArticleRow` (snake_case `unique_id`, `published_at`, …). **Mapear** o shape GraphQL → `ArticleRow` na Server Action. Manter os mapas `agencyNames`/`themeNames` (de `getAgenciesList`/`getThemesWithHierarchy`). **Validar render local** do `/embed` com um `?c=` real.
- Tests: fachada só-GraphQL; ajustar/!remover testes REST.

### Stream C — Core: clipping/marketplace/agent + remoção da infra de flags
**Arquivos:** `src/services/clipping/{index}.ts` + **deletar** `clipping/rest.ts`; `src/services/marketplace/{index}.ts` + **deletar** `marketplace/rest.ts`; `src/components/clipping/AgentRecorteGenerator.tsx`; `src/app/(logged-in)/minha-conta/clipping/page.tsx`; **deletar** `src/lib/graphql/flags.ts` e `src/lib/feature-flags-server.ts`; **trim** `src/lib/feature-flags.ts`; tests: `src/lib/__tests__/feature-flags.test.ts`, `src/services/clipping/__tests__/*`, `src/services/marketplace/__tests__/*`, `src/components/clipping/__tests__/*` (mocks de `GRAPHQL_FLAGS`).
- `clipping/index.ts` e `marketplace/index.ts` (`'use client'`): `useXService()` passa a retornar **sempre** o serviço GraphQL (`createGraphQLXService(getClient())` via `useMemo`); remover `useFeatureFlag`/`GRAPHQL_FLAGS`. Manter `getXService(client?)` (factory para SSR/testes) sem `useGraphQL`/REST. Deletar `rest.ts` (tipos vivem em `types.ts` — confirmado sem re-export de tipo em `rest.ts`).
- `AgentRecorteGenerator.tsx`: remover o switch `useFeatureFlag('graphql.agent')`; renderizar direto a implementação GraphQL; **deletar** `AgentRecorteGeneratorREST` e o `fetch('/api/clipping/generate-recortes')`.
- `clipping/page.tsx` `getClippings()`: remover `resolveGraphQLFlagServer`; sempre `createSSRClient(() => session.accessToken)` + `createGraphQLClippingService(client).listClippings()`. Remover o fallback Firestore-direto; manter `try/catch` que loga e retorna `[]` (degradação graciosa, não é "fallback REST"). Importar de `@/services/clipping/graphql` (não do index `'use client'`).
- `feature-flags.ts`: remover o re-export de `GRAPHQL_FLAGS`/`GraphQLFlagKey` e comentários relacionados. **Manter** `useFeatureFlag(key, default)` e `getFeatureFlag` genéricos (usados por A/B geral). Deletar `flags.ts` e `feature-flags-server.ts`.
- Tests: remover casos de `GRAPHQL_FLAGS`/roteamento REST; manter testes do hook genérico e do path GraphQL.

---

## Validação (orquestrador, após os 3 streams)

Local, em ordem:
1. `pnpm biome check --write src` (formata/organiza imports dos arquivos tocados).
2. `pnpm lint`
3. `pnpm exec vitest run` (suite unit/integ verde; ~529+).
4. `pnpm exec tsc --noEmit` (sem novos erros).
5. `pnpm graphql:codegen` (**gate anti-drift** — ops×SDL; push/widgets reusam queries existentes → deve seguir verde).
6. `pnpm build` (**crítico** — valida boundaries RSC: embed Server Action importando fachada widgets não-`'use client'`; PushSubscriber/WidgetFilters client; SSR clipping).

**Checagem manual no browser (o que o E2E não cobre)** — modo dev local (portal :3000 + graphql-api :8000, ver `portal/CLAUDE.md`):
- `/minha-conta/clipping`: lista carrega via GraphQL (SSR); criar/editar/excluir/toggle ok; agente gera recortes (SSE) ok.
- `PushSubscriber`: abrir o sino → carrega agências (filters-data via GraphQL) e preferências; salvar preferências (updatePushPreferences) ok.
- `/widgets/configurador`: dropdowns de agências/temas carregam (widgetConfig via GraphQL).
- `/embed?c=<config>`: renderiza os cards de notícia corretamente (valida o **mapeamento de shape** GraphQL→ArticleRow).

**E2E staging (gate real), SERIAL `--workers=1`** — após merge→deploy-staging:
```bash
cd portal && source scripts/e2e/load-creds.sh
PLAYWRIGHT_BASE_URL=https://destaquesgovbr-portal-staging-klvx64dufq-rj.a.run.app \
KC_URL=https://destaquesgovbr-keycloak-klvx64dufq-rj.a.run.app \
E2E_GRAPHQL_URL=https://destaquesgovbr-graphql-api-klvx64dufq-rj.a.run.app/graphql \
E2E_PORTAL_ORIGIN=https://destaquesgovbr-portal-staging-klvx64dufq-rj.a.run.app \
E2E_AGENT_SSE=1 \
  pnpm exec playwright test e2e/graphql --project=chromium-authed --project=chromium --reporter=line --workers=1
```
Esperado: **19/19** (a suíte bate no graphql-api direto; valida que os resolvers seguem ok). A wiring de UI de push/widgets/embed é validada manualmente no browser (acima), pois o E2E não exercita esses componentes.

---

## Riscos

- **Embed shape-mapping (Stream B):** maior risco. GraphQL `widgetArticles` (camelCase) → `ArticleRow` (snake_case) consumido por `WidgetNewsCard`. Mitigação: mapear explicitamente + validar render local do `/embed`. É caminho público (ISR 5min), sem auth.
- **Push em browser headless:** subscribe real depende de service worker/VAPID; validar no browser local, não no E2E.
- **Boundaries RSC:** manter `services/push/index.ts` e `services/widgets/index.ts` **sem** `'use client'` (embed/SSR importam server-side). `pnpm build` é o gate.
- **GrowthBook genérico intacto:** não remover `src/ab-testing/`; só a infra `GRAPHQL_FLAGS`.

## Entrega
- 1 PR portal → `development`: `refactor/r1-graphql-sole-path` ("refactor: GraphQL como único caminho — remove flags e fallback REST; liga push/widgets").
- Após validação + E2E staging verde, o usuário promove `development → main` + publica release (deploy de produção), como na rodada anterior.
