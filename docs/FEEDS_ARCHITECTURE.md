# Feeds RSS / Atom / JSON Feed — Arquitetura de Implementação

Documentação técnica da arquitetura, decisões de design e fluxo de dados do sistema de feeds do portal.

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── feed.ts                          # Lógica core: tipos, parsing, validação, query, serialização
│   ├── feed-handler.ts                  # Handler HTTP compartilhado (ETag, cache, erros)
│   ├── markdown-to-html.ts              # Conversor server-side markdown → HTML
│   └── __tests__/
│       ├── feed.test.ts                 # 32 testes unitários
│       └── markdown-to-html.test.ts     # 11 testes unitários
├── app/
│   ├── feed.xml/route.ts                # Route handler RSS 2.0
│   ├── feed.atom/route.ts               # Route handler Atom 1.0
│   ├── feed.json/route.ts               # Route handler JSON Feed 1.1
│   └── (public)/feeds/
│       ├── page.tsx                      # Página de descoberta (Server Component)
│       └── FeedsPageClient.tsx           # Construtor interativo (Client Component)
├── components/
│   └── common/
│       └── FeedLink.tsx                  # Componente de link RSS contextual
```

### Arquivos modificados

| Arquivo | Modificação |
|---------|-------------|
| `src/app/layout.tsx` | Tags `<link rel="alternate">` para autodiscovery |
| `src/components/layout/Footer.tsx` | Link "Feeds RSS" na seção Acesso Rápido |
| `src/app/(public)/busca/QueryPageClient.tsx` | Link RSS contextual com filtros da busca |
| `src/app/(public)/temas/[themeLabel]/ThemePageClient.tsx` | Link RSS contextual do tema |
| `src/app/(public)/orgaos/[agencyKey]/AgencyPageClient.tsx` | Link RSS contextual do órgão |

---

## Fluxo de Dados

```
Request GET /feed.xml?agencias=mre,saude&temas=03
  │
  ▼
Route Handler (feed.xml/route.ts)
  │  export const dynamic = 'force-dynamic'
  │  Delega para handleFeedRequest(request, 'rss')
  │
  ▼
feed-handler.ts — handleFeedRequest()
  │
  ├─ 1. parseFeedParams(searchParams)
  │     Extrai: { agencias: ['mre','saude'], temas: ['03'] }
  │
  ├─ 2. validateFeedParams(params)
  │     Verifica existência de órgãos/temas nos YAMLs
  │     → 400 Bad Request se inválido
  │
  ├─ 3. buildFeed(params)
  │     │
  │     ├─ buildFeedMeta(params)
  │     │   Resolve nomes humanos → título dinâmico
  │     │   "Destaques GOV.BR — MRE, Saúde — Saúde"
  │     │
  │     ├─ queryArticlesForFeed(params, limit)
  │     │   Monta filtro Typesense:
  │     │   filter_by: "agency:[mre,saude] && (theme_1_level_1_code:03 || ...)"
  │     │   sort_by: "published_at:desc,unique_id:desc"
  │     │
  │     └─ Para cada artigo:
  │         markdownToHtml(article.content)
  │         → HTML semântico (sem Tailwind)
  │
  ├─ 4. serializeFeed(feed, 'rss')
  │     feed.rss2() / feed.atom1() / feed.json1()
  │
  ├─ 5. computeETag(body)
  │     MD5 do body → ETag header
  │
  ├─ 6. If-None-Match === ETag → 304 Not Modified
  │
  └─ 7. Response 200
        Content-Type: application/rss+xml; charset=utf-8
        Cache-Control: public, s-maxage=600, stale-while-revalidate=60
        ETag: "a1b2c3..."
```

---

## Decisões de Design

### 1. `force-dynamic` em vez de `revalidate`

Os route handlers usam `export const dynamic = 'force-dynamic'` porque dependem de `searchParams` (query string), que o Next.js não consegue avaliar em tempo de build. O caching é feito via headers HTTP (`Cache-Control`, `ETag`) em vez de ISR.

### 2. Pipeline markdown → HTML compartilhado

O portal tem dois pontos de conversão markdown → HTML:

| Componente | Ambiente | Saída | Plugins |
|------------|----------|-------|---------|
| `MarkdownRenderer.tsx` | Client (React) | React elements + Tailwind | `react-markdown` + `remark-gfm` + `rehype-raw` |
| `markdown-to-html.ts` | Server (Node) | HTML string semântico | `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-raw` + `rehype-stringify` |

Ambos usam o **mesmo ecossistema remark/rehype** com os mesmos plugins (`remark-gfm`, `rehype-raw`), garantindo que a interpretação do markdown seja idêntica. A diferença é a saída: React elements com estilos no portal, HTML limpo/semântico no feed.

Os pacotes `unified`, `remark-*` e `rehype-*` já são dependências transitivas do `react-markdown` — nenhuma dependência nova foi necessária para este módulo.

### 3. Conteúdo truncado

Artigos com mais de 50.000 caracteres de markdown são truncados antes da conversão, com `[...]` adicionado ao final. Isso previne feeds excessivamente grandes.

### 4. Handler HTTP compartilhado

Os 3 route handlers (`feed.xml`, `feed.atom`, `feed.json`) são idênticos exceto pelo formato. Toda a lógica HTTP (parsing, validação, caching, ETag, erros) fica centralizada em `feed-handler.ts`. Cada route handler é apenas:

```typescript
export async function GET(request: NextRequest) {
  return handleFeedRequest(request, 'rss') // ou 'atom' ou 'json'
}
```

### 5. FeedLink isolado do módulo server-only

O componente `FeedLink.tsx` (client component) define seu próprio tipo `FeedLinkParams` e função `buildFeedUrl` localmente, em vez de importar de `@/lib/feed`. Isso porque `feed.ts` importa `node:crypto` (para ETag), que não pode ser bundled para o client. Mesmo `import type` pode causar avaliação do módulo em Turbopack.

### 6. Parâmetros idênticos à busca

Os nomes dos query params (`agencias`, `temas`, `q`, `tag`) são idênticos aos da página `/busca`. Isso permite que links contextuais simplesmente repliquem os filtros ativos do usuário na URL do feed.

---

## Módulos

### `feed.ts` — Lógica Core

Funções exportadas:

| Função | Responsabilidade |
|--------|-----------------|
| `parseFeedParams(searchParams)` | Extrai e normaliza params da URL |
| `validateFeedParams(params)` | Valida existência de órgãos/temas nos YAMLs |
| `buildFeed(params)` | Consulta Typesense, converte markdown, monta objeto `Feed` |
| `serializeFeed(feed, format)` | Serializa para RSS XML, Atom XML ou JSON |
| `feedContentType(format)` | Retorna o Content-Type correto |
| `buildFeedUrlFromParams(params, format)` | Gera URL do feed a partir de params |
| `computeETag(body)` | MD5 do body para ETag |
| `buildQueryString(params)` | Gera query string a partir de FeedParams |

Helpers internos:

| Função | Responsabilidade |
|--------|-----------------|
| `clampLimit(limit)` | Garante limite entre 1 e 50 (default 20) |
| `buildFeedMeta(params)` | Resolve nomes humanos para título dinâmico |
| `queryArticlesForFeed(params, limit)` | Monta filtro Typesense e executa query |
| `buildCategories(article)` | Extrai tema e tags para categorias do feed |

### `feed-handler.ts` — Handler HTTP

Centraliza o ciclo de vida HTTP:
1. Parsing dos params
2. Validação (→ 400)
3. Geração do feed
4. Serialização
5. ETag + condicional 304
6. Response com headers de cache
7. Tratamento de erros (→ 500)

### `markdown-to-html.ts` — Conversor Server-Side

Instância singleton do processador `unified` (criada uma vez, reutilizada). Converte markdown GFM para HTML semântico preservando HTML raw embutido.

---

## Filtros Typesense

A query Typesense segue a mesma sintaxe usada na busca (`queryArticles` em `busca/actions.ts`):

| Parâmetro | Filtro Typesense |
|-----------|-----------------|
| `agencias=mre,saude` | `agency:[mre,saude]` |
| `temas=01,03` | `(theme_1_level_1_code:01 \|\| theme_1_level_2_code:01 \|\| theme_1_level_3_code:01) \|\| (theme_1_level_1_code:03 \|\| ...)` |
| `tag=diplomacia` | `tags:=diplomacia` |
| `q=reforma` | `q: 'reforma'` (full-text search, não filter) |

Filtros são combinados com `&&`. A busca textual (`q`) usa o campo `q` da query Typesense (não `filter_by`).

Temas usam filtro OR em todos os 3 níveis da hierarquia para capturar artigos classificados em qualquer nível.

---

## Caching

### Estratégia de 2 camadas

| Camada | Mecanismo | Efeito |
|--------|-----------|--------|
| CDN/Proxy | `Cache-Control: public, s-maxage=600, stale-while-revalidate=60` | Cloud Run proxy cacheia por 10 min. Revalidação async por 1 min extra. |
| Cliente | `ETag` + `If-None-Match` | Feed readers recebem 304 sem body se conteúdo não mudou |

O `s-maxage=600` garante que polling frequente de feed readers (a cada 5-15 min) é servido pelo cache sem processar a request. O `stale-while-revalidate=60` permite servir conteúdo stale por 1 minuto adicional enquanto revalida em background.

### Sem rate limiting aplicacional

A infraestrutura atual (Cloud Run multi-instância sem Redis) não suporta rate limiting in-memory consistente. A proteção depende de:
- Cache HTTP (mesma URL = 1 hit/10 min)
- Validação de params (rejeita órgãos/temas inexistentes antes de consultar Typesense)
- Proteção DDoS nativa do Cloud Run

Rate limiting robusto requer Cloud Load Balancer + Cloud Armor (issue de infra separada).

---

## Testes

**Framework**: Vitest 2.1.9

### `feed.test.ts` (32 testes)

- **parseFeedParams**: extração e normalização de params
- **validateFeedParams**: validação de limites, existência de órgãos/temas
- **feedContentType**: mapeamento formato → Content-Type
- **serializeFeed**: geração de XML/JSON válido (via objeto `Feed` do pacote `feed`)
- **buildFeedUrlFromParams**: construção de URLs com params
- **buildQueryString**: geração de query string
- **computeETag**: hash MD5 determinístico

### `markdown-to-html.test.ts` (11 testes)

- Conversão de markdown básico, GFM (tabelas, strikethrough), HTML raw
- Input vazio retorna string vazia
- Truncamento de conteúdo longo

### Mocking

Os testes mocam `@/data/agencies-utils` e `@/data/themes-utils` para evitar acesso ao filesystem (os dados vêm de YAMLs). O Typesense não é chamado nos testes unitários.

---

## Dependências

| Pacote | Versão | Uso |
|--------|--------|-----|
| `feed` | ^4.x | Geração de RSS 2.0, Atom 1.0, JSON Feed 1.1 |
| `unified` | (transitiva) | Pipeline de processamento markdown/HTML |
| `remark-parse` | (transitiva) | Parser markdown |
| `remark-gfm` | (existente) | GFM: tabelas, strikethrough, autolinks |
| `remark-rehype` | (transitiva) | Ponte remark → rehype |
| `rehype-raw` | (existente) | Preserva HTML raw no markdown |
| `rehype-stringify` | (transitiva) | Serializa AST rehype para HTML string |

Única dependência nova: **`feed`**. Todos os outros pacotes são dependências existentes ou transitivas do `react-markdown`.

---

## Página de Descoberta (`/feeds`)

### Arquitetura de Componentes

```
FeedsPage (Server Component)
  │  Carrega agencies, themes, topLevelThemes server-side
  │
  └─ FeedsPageClient (Client Component)
       │
       ├─ Construtor de Feed
       │   ├─ AgencyMultiSelect (reutilizado da busca)
       │   ├─ ThemeMultiSelect (reutilizado da busca)
       │   ├─ Input: tag, busca textual
       │   └─ URLs geradas em tempo real (RSS, Atom, JSON) + botão copiar
       │
       ├─ Grid: Feeds por Ministério
       │   Links RSS/Atom diretos para cada ministério
       │
       ├─ Grid: Feeds por Tema
       │   Links RSS/Atom diretos para cada tema nível 1
       │
       └─ Instruções de uso
```

Os componentes `AgencyMultiSelect` e `ThemeMultiSelect` são os mesmos usados na página de busca, garantindo UX consistente.

---

## Links Contextuais

O componente `FeedLink` aparece em 3 páginas, sempre refletindo os filtros ativos:

| Página | Props do FeedLink |
|--------|------------------|
| `/busca?q=reforma&agencias=mre` | `{ q: 'reforma', agencias: ['mre'] }` |
| `/temas/Saude` | `{ temas: ['03'] }` |
| `/orgaos/mre` | `{ agencias: ['mre'] }` |

O `FeedLink` gera a URL do feed RSS correspondente e exibe um ícone RSS com link.

---

## Autodiscovery

O `layout.tsx` inclui metadata `alternates` que o Next.js renderiza como tags `<link>`:

```html
<link rel="alternate" type="application/rss+xml" href="/feed.xml" />
<link rel="alternate" type="application/atom+xml" href="/feed.atom" />
<link rel="alternate" type="application/feed+json" href="/feed.json" />
```

Leitores de feeds que suportam autodiscovery detectam automaticamente os feeds ao visitar qualquer página do portal.
