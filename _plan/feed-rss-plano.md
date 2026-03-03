# Feed RSS / Atom / JSON Feed — Plano de Implementação

## Contexto

O Portal Destaques Gov.br agrega notícias de 156 órgãos do Governo Federal, organizadas por temas (hierarquia 3 níveis) e tags. Atualmente não oferece feeds para consumo programático. Esta feature disponibiliza feeds RSS 2.0, Atom 1.0 e JSON Feed 1.1, permitindo que cidadãos, jornalistas e sistemas assinem notícias filtradas por órgão, tema, tag ou busca textual — usando os mesmos parâmetros da página de busca.

## Decisões do Usuário

- **URLs**: Query params — `/feed.xml?agencias=mre,saude&temas=01,03&q=reforma`
- **Formatos**: RSS 2.0 + Atom 1.0 + JSON Feed 1.1
- **Conteúdo**: Completo (markdown → HTML usando mesmo pipeline da view de artigo)
- **Página de descoberta**: Completa em `/feeds`
- **Links contextuais**: Páginas de busca, temas e órgãos exibem links para o feed correspondente

## Dependências a Instalar

```bash
pnpm add feed
```

Apenas o pacote **`feed`** (~900k downloads/semana) — gera RSS 2.0, Atom 1.0 e JSON Feed 1.1.

**Não instalar `marked`** — a conversão markdown→HTML será feita com `unified` + `remark-gfm` + `rehype-raw` + `rehype-stringify`, pacotes que já são dependências transitivas do `react-markdown` existente no projeto. Isso garante que o feed use o mesmo pipeline de rendering da view de artigo.

---

## Arquitetura

```
Novos arquivos:
  src/lib/markdown-to-html.ts              ← Conversor markdown→HTML server-side (compartilhado)
  src/lib/feed.ts                          ← Lógica de geração de feeds
  src/app/feed.xml/route.ts                ← RSS 2.0 route handler
  src/app/feed.atom/route.ts               ← Atom 1.0 route handler
  src/app/feed.json/route.ts               ← JSON Feed 1.1 route handler
  src/app/(public)/feeds/page.tsx          ← Página de descoberta (Server Component)
  src/app/(public)/feeds/FeedsPageClient.tsx ← Construtor de feed interativo

Arquivos modificados:
  src/app/layout.tsx                       ← Adicionar <link> autodiscovery
  src/components/layout/Footer.tsx         ← Link "Feeds RSS" no footer
  src/app/(public)/busca/QueryPageClient.tsx ← Botão "Assinar Feed" com params atuais
  src/app/(public)/temas/[themeLabel]/ThemePageClient.tsx ← Link feed do tema
  src/app/(public)/orgaos/[agencyKey]/AgencyPageClient.tsx ← Link feed do órgão
```

Route handlers ficam na raiz (`src/app/`) porque retornam `Response` — não passam por layouts.

---

## Implementação Detalhada

### 1. `src/lib/markdown-to-html.ts` — Conversor Compartilhado

Usa o **mesmo ecossistema remark/rehype** que o `MarkdownRenderer.tsx` (que usa `react-markdown` + `remark-gfm` + `rehype-raw`), mas gera string HTML em vez de React elements.

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)          // Mesmo plugin do MarkdownRenderer
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)          // Mesmo plugin do MarkdownRenderer
  .use(rehypeStringify)

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await processor.process(markdown)
  return String(result)
}
```

**Por que não usar `marked`**: O `MarkdownRenderer.tsx` usa `react-markdown` com `remark-gfm` + `rehype-raw`. Usando o mesmo ecossistema unified/remark/rehype server-side, garantimos:
- Mesma interpretação do markdown (GFM: tabelas, strikethrough, autolinks)
- Mesmo tratamento de HTML raw embutido no markdown
- Melhorias futuras no pipeline de rendering (novos plugins remark/rehype) são refletidas em ambos

**Nota**: Os estilos Tailwind do `MarkdownRenderer.tsx` (component overrides) são específicos da UI e não se aplicam ao feed — no feed o HTML é limpo/semântico, o que é o correto para RSS.

### 2. `src/lib/feed.ts` — Lógica Core

**Parâmetros aceitos** (mesmos da página de busca):

| Param | Formato | Exemplo | Origem |
|-------|---------|---------|--------|
| `q` | string | `q=reforma tributária` | Busca textual |
| `agencias` | comma-separated | `agencias=mre,saude` | Múltiplos órgãos |
| `temas` | comma-separated | `temas=01,03,01.02` | Múltiplos temas (qualquer nível) |
| `tag` | string | `tag=diplomacia` | Tag única |
| `limit` | number | `limit=30` | Items no feed (default 20, max 50) |

Nomes `agencias` e `temas` (não `orgao`/`tema`) — idênticos aos usados na URL da busca (`/busca?agencias=mre,saude&temas=...`).

Funções exportadas:
- `parseFeedParams(searchParams)` → `FeedParams`
- `validateFeedParams(params)` → valida existência de agencias/temas nos YAMLs, retorna erro ou ok
- `buildFeed(params, format, requestUrl)` → `Feed`
- `serializeFeed(feed, format)` → string
- `feedContentType(format)` → Content-Type header
- `buildFeedUrlFromParams(params, format)` → URL string (para uso nos links contextuais)

Fluxo interno de `buildFeed`:
1. Resolve labels humanos para título dinâmico (via `getAgenciesByName()`, `getThemeNameByCode()`)
2. Monta filtro Typesense **usando mesma sintaxe da busca**:
   - Agencies: `agency:[mre,saude]`
   - Temas: `(theme_1_level_1_code:01 || theme_1_level_2_code:01 || theme_1_level_3_code:01) || (...)`
   - Tag: `tags:=diplomacia`
3. Query Typesense: `q: params.q || '*'`, `query_by: 'title,content'`, `sort_by: 'published_at:desc'`, `limit: 20`
4. Para cada artigo: converte `content` via `markdownToHtml()` (do módulo compartilhado)
5. Retorna objeto `Feed` do pacote `feed`

Título dinâmico:
- Sem filtros: "Destaques GOV.BR"
- `agencias=mre`: "Destaques GOV.BR — Ministério das Relações Exteriores"
- `temas=03`: "Destaques GOV.BR — Saúde"
- `agencias=mre,saude`: "Destaques GOV.BR — MRE, Saúde"
- Combinado: "Destaques GOV.BR — MRE — Saúde — Busca: reforma"

### 3. Route Handlers (feed.xml, feed.atom, feed.json)

Os 3 são idênticos exceto pelo formato. Cada um:

```
1. parseFeedParams(searchParams)
2. validateFeedParams(params) → 400 se agencia/tema inválido
3. buildFeed(params, format, url)
4. serializeFeed(feed, format)
5. Computar ETag (MD5 do body)
6. Checar If-None-Match → 304 se match
7. Retornar Response com headers:
   - Content-Type: application/rss+xml (ou atom+xml, feed+json)
   - Cache-Control: public, s-maxage=600, stale-while-revalidate=60
   - ETag: "hash"
```

### 4. `src/app/layout.tsx` — Autodiscovery

Adicionar `alternates` ao metadata existente:

```typescript
export const metadata: Metadata = {
  title: 'Destaques GOV',
  description: '...',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
      'application/atom+xml': '/feed.atom',
      'application/feed+json': '/feed.json',
    },
  },
}
```

### 5. Links Contextuais nas Páginas Existentes

**Página de Busca** (`src/app/(public)/busca/QueryPageClient.tsx`):
- Adicionar botão/link "Assinar Feed" (icone RSS) ao lado dos filtros ou nos resultados
- Gera URL do feed com os mesmos params atuais: `/feed.xml?q=...&agencias=...&temas=...`
- Atualiza dinamicamente conforme o usuário muda filtros

**Página de Tema** (`src/app/(public)/temas/[themeLabel]/`):
- Adicionar link RSS no header da página: "Assinar feed deste tema"
- URL: `/feed.xml?temas={themeCode}`

**Página de Órgão** (`src/app/(public)/orgaos/[agencyKey]/`):
- Adicionar link RSS no header da página: "Assinar feed deste órgão"
- URL: `/feed.xml?agencias={agencyKey}`

Componente reutilizável simples (icone RSS + link) para usar nos 3 lugares.

### 6. Página `/feeds` — Descoberta

**Server Component** (`page.tsx`):
- Carrega `getAgenciesList()` e `getThemesWithHierarchy()` server-side

**Client Component** (`FeedsPageClient.tsx`):
- **Construtor de Feed**: multi-selects para órgãos e temas (mesmos componentes da busca) + input para busca textual e tag
- Gera URLs dos 3 formatos em tempo real
- Botão copiar URL para clipboard
- **Feeds por Órgão**: grid com ministérios, links RSS/Atom diretos
- **Feeds por Tema**: grid com temas nível 1, links diretos

### 7. `Footer.tsx` — Link

Adicionar item "Feeds RSS" na lista "Acesso Rápido", apontando para `/feeds`.

---

## Rate Limiting — Estratégia Revisada

### Situação da Infraestrutura

Investigação revelou:
- **Cloud Run** com auto-scaling 1-10 instâncias (prod), sem estado compartilhado
- **Sem Load Balancer** na frente (Cloud Run gerencia ingress direto)
- **Sem Cloud Armor** (requer LB externo)
- **Sem Redis/Memorystore**
- **Sem rate limiting existente** no portal

**Rate limit in-memory NÃO funciona** — requests são distribuídos entre instâncias, cada uma com memória isolada.

### Abordagem Adotada: 2 Camadas (sem infra adicional)

| Camada | Protege contra | Como |
|--------|---------------|------|
| **Cache HTTP** (`s-maxage=600`) | Polling normal de feed readers | CDN/Cloud Run proxy serve cache. Mesmo URL = 1 hit no servidor por 10 min |
| **Validação de params** | Cache-busting com params fabricados | Rejeita agencia/tema inexistentes com 400 antes de consultar Typesense |

**Por que isso é suficiente para agora:**
- `s-maxage=600` no Cloud Run faz o proxy servir respostas cacheadas para o mesmo URL
- A validação de params impede que atacantes gerem infinitas variações de URL para bypassar o cache
- O Typesense tem seu próprio throttling e é resiliente a carga
- Cloud Run tem proteção DDoS básica built-in

### Recomendação Futura (issue separada)

Para rate limiting robusto em produção, criar issue para:
1. Adicionar **Cloud Load Balancer** externo no Terraform
2. Configurar **Cloud Armor** com rate limiting policy (ex: 60 req/min por IP)
3. Isso protege **todas** as rotas do portal, não só feeds

Isso é infra, não feature — deve ser tratado separadamente.

---

## Testes Automatizados

Framework: **Vitest** 2.1.9 + @testing-library/react. Config em `vitest.config.ts`. Fixtures em `src/__tests__/mocks/fixtures/articles.ts` (`createMockArticle()`).

### `src/lib/__tests__/markdown-to-html.test.ts`

- Converte markdown simples para HTML
- Suporta GFM (tabelas, strikethrough, autolinks)
- Preserva HTML raw embutido (rehype-raw)
- Retorna string vazia para input vazio
- Trunca conteúdo longo com `[...]`

### `src/lib/__tests__/feed.test.ts`

- `parseFeedParams`: extrai params corretos de URLSearchParams
- `parseFeedParams`: retorna undefined para params ausentes
- `parseFeedParams`: split de agencias/temas comma-separated em arrays
- `validateFeedParams`: aceita agencias/temas válidos
- `validateFeedParams`: rejeita agencia inexistente
- `validateFeedParams`: rejeita tema inexistente
- `validateFeedParams`: limita `q` a 200 chars, `tag` a 100 chars
- `feedContentType`: retorna tipo correto para cada formato
- `serializeFeed`: gera XML válido para RSS
- `serializeFeed`: gera XML válido para Atom
- `serializeFeed`: gera JSON válido para JSON Feed
- `buildFeedUrlFromParams`: constroi URL correta com params
- `buildFeedUrlFromParams`: omite params vazios
- `buildTypesenseFilter`: gera filtro correto para múltiplas agencias
- `buildTypesenseFilter`: gera filtro correto para múltiplos temas (OR)
- `buildTypesenseFilter`: combina filtros com AND

### `src/lib/__tests__/feed-integration.test.ts` (mock Typesense)

- `buildFeed` com mock de Typesense retorna Feed com items corretos
- Feed items contém HTML convertido do markdown
- Título dinâmico baseado em filtros de agencia
- Título dinâmico baseado em filtros de tema
- Feed sem filtros usa título padrão

## Sequência de Implementação

1. `pnpm add feed`
2. Criar `src/lib/markdown-to-html.ts` (conversor compartilhado)
3. Criar `src/lib/feed.ts` (core logic com params multi-valor)
4. Criar `src/app/feed.xml/route.ts`
5. Criar `src/app/feed.atom/route.ts`
6. Criar `src/app/feed.json/route.ts`
7. Testar feeds com `curl`
8. Modificar `src/app/layout.tsx` (autodiscovery)
9. Modificar `src/components/layout/Footer.tsx` (link)
10. Criar `src/app/(public)/feeds/page.tsx` + `FeedsPageClient.tsx`
11. Adicionar links RSS em `QueryPageClient.tsx` (busca)
12. Adicionar links RSS na página de tema
13. Adicionar links RSS na página de órgão
14. Testar tudo no browser

## Verificação

```bash
# Feed principal (sem filtros)
curl -s http://localhost:3000/feed.xml | head -20

# Feed com múltiplos órgãos
curl -s "http://localhost:3000/feed.xml?agencias=mre,saude" | head -20

# Feed com múltiplos temas
curl -s "http://localhost:3000/feed.atom?temas=01,03" | head -20

# Feed combinado (como vindo da busca)
curl -s "http://localhost:3000/feed.xml?q=reforma&agencias=mre&temas=01" | head -20

# JSON Feed
curl -s "http://localhost:3000/feed.json" | python3 -m json.tool | head -20

# ETag/304
ETAG=$(curl -sI http://localhost:3000/feed.xml | grep -i etag | awk '{print $2}' | tr -d '\r')
curl -sI -H "If-None-Match: $ETAG" http://localhost:3000/feed.xml  # 304

# Validação (orgao inválido → 400)
curl -s "http://localhost:3000/feed.xml?agencias=invalido"

# Página de descoberta
open http://localhost:3000/feeds

# Autodiscovery no HTML
curl -s http://localhost:3000 | grep 'alternate'

# Verificar links RSS nas páginas
curl -s http://localhost:3000/busca?q=teste | grep 'feed'
curl -s http://localhost:3000/temas/Saude | grep 'feed'
curl -s http://localhost:3000/orgaos/mre | grep 'feed'
```

## Arquivos Críticos (referência)

| Arquivo | Papel |
|---------|-------|
| `src/components/common/MarkdownRenderer.tsx` | Pipeline de rendering atual (referência para paridade) |
| `src/services/typesense/client.ts` | Cliente Typesense (reutilizar) |
| `src/types/article.ts` | Tipo `ArticleRow` |
| `src/data/agencies-utils.ts` | `getAgenciesByName()`, `getAgenciesList()` |
| `src/data/themes-utils.ts` | `getThemeNameByCode()`, `getThemesWithHierarchy()` |
| `src/lib/utils.ts` | `getExcerpt()`, `stripMarkdown()` |
| `src/app/(public)/busca/actions.ts` | `queryArticles()` — referência para filtros multi-valor |
| `src/app/(public)/busca/QueryPageClient.tsx` | Adicionar link RSS contextual |
| `src/app/(public)/temas/[themeLabel]/` | Adicionar link RSS contextual |
| `src/app/(public)/orgaos/[agencyKey]/` | Adicionar link RSS contextual |
| `src/app/layout.tsx` | Metadata + autodiscovery |
| `src/components/layout/Footer.tsx` | Link para /feeds |
| `infra/terraform/portal.tf` | Cloud Run config (ref. para issue de Cloud Armor) |
