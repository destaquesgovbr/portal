# Feeds RSS / Atom / JSON Feed — API

O portal oferece feeds de notícias em 3 formatos padrão, com suporte a filtros por órgão, tema, tag e busca textual.

## Endpoints

| Formato | URL | Content-Type |
|---------|-----|-------------|
| RSS 2.0 | `/feed.xml` | `application/rss+xml; charset=utf-8` |
| Atom 1.0 | `/feed.atom` | `application/atom+xml; charset=utf-8` |
| JSON Feed 1.1 | `/feed.json` | `application/feed+json; charset=utf-8` |

Os 3 endpoints aceitam os mesmos parâmetros e retornam os mesmos artigos — apenas o formato de serialização muda.

---

## Parâmetros

Todos os parâmetros são opcionais. Sem parâmetros, o feed retorna as 20 notícias mais recentes de todos os órgãos e temas.

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `agencias` | string (comma-separated) | Filtra por um ou mais órgãos (slug) | `agencias=mre,saude` |
| `temas` | string (comma-separated) | Filtra por um ou mais temas (código) | `temas=01,03` |
| `tag` | string | Filtra por tag exata | `tag=diplomacia` |
| `q` | string | Busca textual em título e conteúdo | `q=reforma tributária` |
| `limit` | number | Quantidade de itens (default: 20, máx: 50) | `limit=30` |

Os nomes dos parâmetros (`agencias`, `temas`, `q`) são idênticos aos usados na URL da página de busca (`/busca`).

### Limites de validação

| Parâmetro | Limite |
|-----------|--------|
| `q` | Máximo 200 caracteres |
| `tag` | Máximo 100 caracteres |
| `agencias` | Cada slug deve existir no cadastro de órgãos |
| `temas` | Cada código deve existir no cadastro de temas |
| `limit` | Mínimo 1, máximo 50 |

---

## Exemplos

### Feed geral (sem filtros)
```
GET /feed.xml
```

### Feed de um órgão
```
GET /feed.xml?agencias=mre
```

### Feed de múltiplos órgãos
```
GET /feed.xml?agencias=mre,saude,mgi
```

### Feed de um tema
```
GET /feed.atom?temas=03
```

### Feed combinado (órgão + tema + busca)
```
GET /feed.xml?agencias=mre&temas=01&q=reforma
```

### JSON Feed com limite customizado
```
GET /feed.json?limit=50
```

---

## Respostas

### 200 OK

Retorna o feed no formato solicitado. Headers incluídos:

```
Content-Type: application/rss+xml; charset=utf-8
Cache-Control: public, s-maxage=600, stale-while-revalidate=60
ETag: "a1b2c3d4e5f6..."
```

### 304 Not Modified

Se o cliente envia `If-None-Match` com o ETag da última resposta e o conteúdo não mudou, retorna 304 sem body.

```
GET /feed.xml
If-None-Match: "a1b2c3d4e5f6..."

→ 304 Not Modified
```

### 400 Bad Request

Retorna JSON quando um parâmetro é inválido:

```json
{
  "error": "Órgão 'invalido' não encontrado",
  "field": "agencias"
}
```

### 500 Internal Server Error

```json
{
  "error": "Erro ao gerar o feed"
}
```

---

## Conteúdo dos itens

Cada item do feed contém:

| Campo | Origem | Descrição |
|-------|--------|-----------|
| `title` | `article.title` | Título do artigo |
| `link` | `/artigos/{unique_id}` | URL do artigo no portal |
| `description` | `summary` ou `editorial_lead` ou excerpt | Resumo curto |
| `content` | `article.content` → HTML | Conteúdo completo convertido de markdown para HTML |
| `date` | `article.published_at` | Data de publicação |
| `image` | `article.image` | URL da imagem de capa |
| `category` | tema + tags | Categorias do artigo |
| `author` | nome do órgão | Órgão que publicou |

O conteúdo markdown é convertido para HTML usando o mesmo pipeline remark/rehype do `MarkdownRenderer.tsx`, garantindo paridade de rendering entre o feed e a view de artigo.

---

## Título dinâmico do feed

O título do feed se adapta aos filtros selecionados:

| Filtros | Título |
|---------|--------|
| Nenhum | "Destaques GOV.BR" |
| `agencias=mre` | "Destaques GOV.BR — Ministério das Relações Exteriores" |
| `temas=03` | "Destaques GOV.BR — Saúde" |
| `agencias=mre&temas=03` | "Destaques GOV.BR — Ministério das Relações Exteriores — Saúde" |
| `q=reforma` | "Destaques GOV.BR — Busca: reforma" |

---

## Autodiscovery

O layout do portal inclui tags `<link rel="alternate">` para que leitores de feeds descubram automaticamente os feeds disponíveis:

```html
<link rel="alternate" type="application/rss+xml" href="/feed.xml" />
<link rel="alternate" type="application/atom+xml" href="/feed.atom" />
<link rel="alternate" type="application/feed+json" href="/feed.json" />
```

---

## Caching

| Header | Valor | Efeito |
|--------|-------|--------|
| `Cache-Control` | `public, s-maxage=600, stale-while-revalidate=60` | CDN/proxy serve cache por 10 min, reval async por 1 min extra |
| `ETag` | MD5 do body | Cliente pode enviar `If-None-Match` para receber 304 |

Na prática, feed readers que fazem polling a cada poucos minutos receberão respostas cacheadas sem custo de processamento.

---

## Página de descoberta

A página `/feeds` oferece:

- **Construtor interativo**: multi-select de órgãos e temas (mesmos componentes da busca), campos de tag e busca. Gera URLs dos 3 formatos em tempo real com botão de copiar.
- **Feeds por Ministério**: grid com links RSS/Atom diretos para cada ministério.
- **Feeds por Tema**: grid com links RSS/Atom diretos para cada tema de nível 1.
- **Instruções**: guia passo a passo para usar os feeds.

---

## Links contextuais

Além da página `/feeds`, links "Feed RSS" aparecem em:

| Página | Parâmetros do feed |
|--------|--------------------|
| `/busca?q=...&agencias=...&temas=...` | Mesmos filtros ativos na busca |
| `/temas/{themeLabel}` | `temas={themeCode}` |
| `/orgaos/{agencyKey}` | `agencias={agencyKey}` |
| Footer (todas as páginas) | Link para `/feeds` |
