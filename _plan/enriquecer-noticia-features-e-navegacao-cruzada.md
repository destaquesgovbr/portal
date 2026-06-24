# Enriquecer a tela da notícia com features do feature_worker + navegação cruzada

> **Diretrizes de implementação (desta execução):**
> - **Workflow orchestration** (ultracode) para as fases.
> - **TDD** sempre que possível: teste primeiro → implementação → verde.
> - **Local-first**: subir graphql-api (`make dev` :8000) + portal (`pnpm dev` :3000) localmente para debug rápido antes de qualquer CI/deploy. graphql-api dev fala com Postgres/Typesense **reais** do GCP.
> - **Frontend** via skill `/frontend-design:frontend-design` para UI nova (chips de entidade, páginas de entidade, controles de filtro).
> - **Branches**: portal → `development` (NUNCA `main` durante R1); graphql-api → `feat/*` → `main`; data-platform → fluxo próprio.

## Context

Hoje a página de uma notícia (`/artigos/[articleId]`) mostra "notícias relacionadas", mas a seleção **não usa** as features calculadas pelo `data-platform`. O resolver público `relatedArticles` (graphql-api, `public_content.py:93-125`) escolhe por **theme-code no Typesense** (`most_specific_theme_code` → senão `theme_1_level_1_code`, dedup por `content_hash`, top 4 por data). A similaridade semântica real (`similar_articles`, pgvector cosine) e a extração de entidades (`entities`, NER via Bedrock) **existem** em `news_features` (JSONB), mas o tipo público `Article` não expõe **nenhuma** feature — ele é populado só do Typesense.

Objetivo: (1) trocar relacionadas para similaridade semântica; (2) enriquecer a tela da notícia com **entidades** (instituições/pessoas/locais), **popularidade & trending** e **leitura & legibilidade**; (3) habilitar **navegação cruzada** por entidade — tanto via filtro na `/busca` quanto via **páginas dedicadas de entidade** (`/entidades/[slug]`); (4) adicionar filtros novos à `/busca`: **entidades**, **sentimento** e **ordenação por trending/views**.

Decisões tomadas com o usuário:
- Relacionadas → **semântica (embedding)**.
- Exibir na notícia → **entidades, popularidade & trending, leitura & legibilidade** (sem sentimento na tela).
- Navegação cruzada → **ambos**: filtro na busca **e** páginas de entidade.
- Novos filtros → **entidades, sentimento, ordenar por trending/views**.

## Arquitetura-alvo (dois caminhos de dados)

| Capacidade | Caminho | Custo |
|---|---|---|
| **Exibir** features numa notícia (entidades, views, trending, word_count, flesch) | **Postgres** — `news_features.features` JSONB, lookup por `unique_id` (lazy, batched) | Baixo. Nenhum reindex. |
| **Relacionadas** semânticas | **Postgres** — `get_similar_articles()` (pgvector) → hidrata via Typesense | Baixo. Resolver já existe. |
| **Filtrar / facetar / ordenar** por entidade, sentimento, trending, views | **Typesense** — campos facetáveis/sortáveis | Médio. Exige schema-update + reindex no data-platform. |

Princípio: o que é só **leitura de uma notícia** sai do Postgres (rápido, sem mexer no Typesense). O que precisa de **busca/agregação em escala** vai pro Typesense.

## Pré-requisito / Gate de dados (verificar ANTES de construir)

O `enrichment-worker` (entities/sentiment) foi reportado como "em desenvolvimento". **Confirmar cobertura real** de `entities` em produção antes de investir na trilha de entidades:

```sql
SELECT count(*) FILTER (WHERE features ? 'entities') AS com_entities,
       count(*) AS total
FROM news_features;
SELECT features->'entities' FROM news_features WHERE features ? 'entities' LIMIT 5;
```
- Se cobertura baixa → rodar/agendar backfill do enrichment (`data-science/src/news_enrichment/`) antes das fases que dependem de entidades.
- `trending_score`, `view_count`, `word_count`, `readability_flesch` já têm pipeline (DAGs + feature-worker) e parcialmente já vão pro Typesense.

---

## Fase 0 — data-platform: indexar entidades + view_count no Typesense

Necessária só para **filtro/facet/ordenação** (Fases 2/4). A exibição na notícia (Fases 1/3) não depende disto.

**Arquivos:**
- `data-platform/src/data_platform/typesense/collection.py` (`COLLECTION_SCHEMA`): adicionar
  - `entity_org`, `entity_per`, `entity_loc`, `entity_misc` → `type: "string[]", facet: true, optional: true`
  - opcional: `entities` (string[] facet) achatado para filtro "qualquer tipo"
  - `view_count` → `type: "int32", facet: false, optional: true, sort: true`
  - (`trending_score` já `sort:true`; `sentiment_label` já `facet:true`.)
- `data-platform/src/data_platform/workers/typesense_sync/handler.py` (+ `typesense/indexer.py`): mapear `features.entities` → arrays por tipo e `features.view_count` → `view_count`.

**Deploy/backfill (workflows manuais, NÃO terraform local):**
- `gh workflow run typesense-schema-update.yaml` (PATCH aditivo idempotente).
- `gh workflow run typesense-maintenance-sync.yaml` para popular nos docs existentes.

## Fase 1 — graphql-api: expor features no `Article` + relacionadas semânticas

**Branch:** `feat/*` → `main`. Rodar `e2e/graphql` antes de mergear.

**1a. Novos tipos** (`schema/types/`):
- `EntityType { text: String!, type: String!, count: Int! }`
- `ArticleFeatures { entities: [EntityType!]!, viewCount: Int, uniqueSessions: Int, trendingScore: Float, wordCount: Int, readabilityFlesch: Float }`

**1b. Campo `features` lazy no `Article`** (`schema/types/article.py`):
- `@strawberry.field async def features(self, info) -> Optional[ArticleFeatures]` usando `self.unique_id` + **DataLoader** novo. Só resolve quando a operação seleciona `features { ... }` — listas/busca que pedem só `...ArticleFields` não pagam custo.
- DataLoader em `dataloaders.py` (`create_features_loader(postgres_ds)`): batch por `unique_id` lendo `news_features.features` (reusar `PostgresDatasource.get_news_batch()`). Registrar no `context.py`.
- `entities` ausente → `[]`.

**1c. `relatedArticles` → semântico** (`schema/resolvers/public_content.py:93-125`):
- Trocar theme-code por `postgres_ds.get_similar_articles(unique_id, threshold≈0.7, limit)` → hidratar para `Article` via **novo** `TypesenseDatasource.get_articles_by_ids(ids)`, **preservando ordem de similaridade**.
- Assinatura GraphQL **inalterada** → zero drift; portal já chama e já rotula como "similaridade semântica".
- Resolver passa a `async`. Fallback: sem embedding/sem vizinhos → `[]`.

**1d.** `make docs-schema` + testes (`tests/test_schema.py`).

## Fase 2 — graphql-api: filtros + ordenação na busca

**2a. `ArticleFilter`** (`schema/types/article.py:43`): `entities: Optional[list[str]]`, `sentiment: Optional[list[str]]`.
**2b. `sort`** nos resolvers `search`/`articles`: enum `RELEVANCE | DATE | TRENDING | VIEWS` → `sort_by` Typesense.
**2c. `search_articles`** (`datasources/typesense.py:159`): tratar `entities` (`entity_*:=[...]` OR), `sentiment` (`sentiment_label:[...]`), `sort_by`.
**2d. `entitySuggestions(query, type, limit): [EntityFacet!]`** via Typesense `facet_query`/`facet_by` sobre `entity_*`. ⚠️ Loaders em `dataloaders.py:12,31` usam `collections["articles"]`, mas a coleção é `"news"` — usar `"news"` no código novo.
**2e.** `make docs-schema` + testes.

## Fase 3 — portal: tela da notícia enriquecida

**Branch:** `development`. Skills: `portal-implementation`, `frontend-design`, `use-button-component`, `reuse-components`, `no-index-key`.

**3a. Query** (`src/lib/graphql/queries/articles.ts`): estender **só** `ARTICLE_QUERY` (não o fragment) com `features { entities { text type count } viewCount uniqueSessions trendingScore wordCount readabilityFlesch }`. Atualizar interfaces + mapper (`services/content/graphql.ts`, `types/article.ts`).

**3b. UI `components/articles/ClientArticle.tsx`:**
- **Entidades**: chips agrupados (Instituições/Pessoas/Locais via `type`), clicáveis → `/entidades/[slug]`. Componente `Button` + chips existentes.
- **Popularidade & trending**: views + selo "Em alta" por `trendingScore`.
- **Leitura & legibilidade**: tempo ≈ `wordCount/200` min + faixa de `readabilityFlesch`.
- `features == null` → esconder seções. Manter ISR.

**3c.** Relacionadas já vêm semânticas (Fase 1, sem mudança de operação). Ajustar título se desejado.

## Fase 4 — portal: filtros na busca + páginas de entidade

**4a. Filtros `/busca`** (`components/articles/ArticleFilters.tsx` + `app/(public)/busca/QueryPageClient.tsx` + `actions.ts`): multiselect de entidades (typeahead via `entitySuggestions`), select de sentimento, dropdown de ordenação. Params `entidades`, `sentimento`, `ordenar`. Passar `filter.entities`, `filter.sentiment`, `sort` ao `SEARCH_QUERY`.

**4b. Páginas de entidade** — `app/(public)/entidades/[slug]/page.tsx` (+ client): helpers slug; header resolve label/tipo/contagem via `entitySuggestions`; lista paginada via `search` com `filter.entities=[label]` (reusar `NewsCard` + `useInfiniteQuery`). `generateMetadata` p/ SEO. Frontend via `frontend-design`.

## Reuso (não recriar)

- `PostgresDatasource.get_similar_articles()` (`datasources/postgres.py:381`).
- `_NEWS_BASE_SQL` / `get_news_batch()` (já faz `LEFT JOIN news_features`, devolve `.features`).
- Padrão DataLoader (`dataloaders.py`).
- `update_schema()` (`typesense/collection.py:267`) — PATCH aditivo.
- Portal: `NewsCard`, `Button`, `useInfiniteQuery`, facade `services/content/graphql.ts`, sync filtro↔URL de `/busca`.

## Riscos & gates

- **Cobertura de `entities`** (gate Fase 0) — sem dados, a trilha de entidades não renderiza. Verificar/backfill primeiro.
- **Canonicalização de entidades** — texto livre do LLM; v1 = match exato; normalização (cruzar com `agencies`) é fast-follow.
- **Drift gate (R1-01)** — `relatedArticles` não muda assinatura; `features`/`ArticleFilter.entities,sentiment`/`sort` são aditivos/nullable. `make docs-schema` + `e2e/graphql` antes de mergear o graphql-api.
- **Ordem**: Fase 0 → 1/2 → 3/4. Exibição de entidades (1/3) é independente do Typesense (0) — pode sair antes do filtro/facet.

## Verificação (E2E)

1. **graphql-api** (`make dev` :8000): `pytest` + `make docs-schema` sem diff; smoke `article{features{...}}`, `relatedArticles`, `search(filter:{entities})`, `sort:TRENDING`.
2. **portal** (gate real = Playwright no browser): estender `e2e/graphql/public-content.spec.ts` (chips + stats + clique→`/entidades`); novo spec `/busca` (filtro entidade/sentimento + ordenação). Suíte `e2e/graphql` **serial** (`--workers=1`). Rodar portal + graphql-api locais.
3. **data-platform**: após `typesense-maintenance-sync`, conferir doc com `entity_org`/`view_count`; validar facet via `entitySuggestions`.
