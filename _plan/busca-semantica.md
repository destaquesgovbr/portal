# Plano: Busca Semântica (Hybrid Search) no Portal

## Contexto

O portal já usa Typesense para busca textual (BM25) em `title` e `content`. Existe um serviço separado de embeddings (`paraphrase-multilingual-mpnet-base-v2`, 768 dims) rodando via FastAPI. O objetivo é evoluir a busca para **hybrid search**: combinar BM25 com busca vetorial semântica, melhorando a relevância especialmente para queries conceituais em português.

A busca de autocomplete (dropdown com 7 sugestões) **não será alterada** — adicionar latência de embeddings prejudicaria a experiência do autocomplete.

---

## Escopo

**Apenas a busca de resultados** (`/busca`) entra em hybrid mode. O autocomplete permanece idêntico.

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/services/typesense/client.ts` | sem mudança (reaproveitado) |
| `src/services/embeddings/client.ts` | **criar** — cliente HTTP para o serviço de embeddings |
| `src/app/(public)/busca/actions.ts` | modificar `queryArticles` para hybrid search |
| `src/types/search.ts` | adicionar campo `searchMode` opcional ao `QueryArticlesArgs` |
| `.env.example` | adicionar `EMBEDDINGS_API_URL` |

---

## Pré-requisito de infraestrutura

✅ A coleção `news` já possui o campo `embedding` (float[768]) com vetores indexados.

---

## Implementação

### 1. Env var

```
# .env.example
EMBEDDINGS_API_URL=http://localhost:8000  # URL interna do serviço de embeddings
```

Nota: sem prefixo `NEXT_PUBLIC_` — chamada server-side apenas.

### 2. Cliente do serviço de embeddings

**Criar**: `src/services/embeddings/client.ts`

```typescript
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const url = process.env.EMBEDDINGS_API_URL
  if (!url) return null

  try {
    const res = await fetch(`${url}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3000), // fallback em 3s
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.embedding as number[]
  } catch {
    return null  // fallback gracioso para busca textual
  }
}
```

### 3. Modificar `queryArticles` em `actions.ts`

```typescript
// Gerar embedding da query (apenas se tiver texto)
const embedding = query ? await generateEmbedding(query) : null

// Montar vector_query se embedding disponível
const vectorQuery = embedding
  ? `embedding:([${embedding.join(',')}], k:100, alpha:0.4)`
  : undefined

const result = await typesense.collections<ArticleRow>('news').documents().search({
  q: query?.trim().replace(/\s+/g, ' ') ?? '*',
  query_by: vectorQuery ? 'title,content,embedding' : 'title,content',
  vector_query: vectorQuery,
  sort_by: 'published_at:desc, unique_id:desc',
  filter_by: buildFilterBy({ startDate, endDate, agencies, themes }),
  limit: PAGE_SIZE,
  page: pageNum,
})
```

**Comportamento de fallback**: se `EMBEDDINGS_API_URL` não estiver configurado ou o serviço retornar erro, a busca cai automaticamente para BM25 puro — sem quebrar nada.

### 4. UI — toggle visível em /busca, transparente em outros contextos

**Na página `/busca`**: toggle sutil no topo dos resultados (ao lado dos filtros):

```
[🔍 busca inteligente ●]   Filtros ▼
```

- Default: **ativo** (sem param na URL)
- Desativado: `?semantica=0` na URL → busca textual pura
- Permite o usuário comparar os dois modos

**Em outros contextos** (home, artigos, etc.): hybrid ativo por padrão, sem UI exposta.

### 5. Tipo atualizado

```typescript
type QueryArticlesArgs = {
  query?: string
  page: number
  startDate?: number
  endDate?: number
  agencies?: string[]
  themes?: string[]
  semantic?: boolean  // novo — default true
}
```

---

## Alpha recomendado

`alpha: 0.4` como ponto de partida:
- 60% peso BM25 (mantém precisão para buscas exatas)
- 40% peso semântico (melhora recall para queries conceituais)

Ajustável via variável de ambiente `TYPESENSE_SEMANTIC_ALPHA` futuramente.

---

## Verificação

1. `EMBEDDINGS_API_URL` configurado no `.env.local`
2. Buscar por termo exato (ex: "Lula") → resultados similares ao modo atual
3. Buscar por conceito (ex: "combate à fome") → resultados mais relevantes que modo textual
4. Derrubar o serviço de embeddings → busca continua funcionando (fallback BM25)
5. Toggle visível em `/busca`; desativar → `?semantica=0` na URL → `vector_query` ausente na chamada Typesense
