# Plano: Clipping Marketplace

## Context

Evoluir o sistema de clippings adicionando um marketplace público onde usuários podem publicar, seguir, clonar e curtir clippings. Seguidores herdam recortes/prompt do autor automaticamente, definindo apenas horário e canais. Também adicionar campos `description` (clipping) e `title` (recorte).

---

## Firestore Schema

### Coleção nova: `marketplace/{listingId}`

```
{
  authorUserId: string
  authorDisplayName: string
  sourceClippingId: string
  name: string
  description: string
  recortes: Recorte[]          // com title em cada
  prompt: string
  likeCount: number            // FieldValue.increment()
  followerCount: number
  cloneCount: number
  publishedAt: Timestamp
  updatedAt: Timestamp
  active: boolean
}
```

### Subcoleção: `marketplace/{listingId}/likes/{userId}`

```
{ createdAt: Timestamp }
```

### Campos adicionados em `users/{userId}/clippings/{clippingId}`

```
description?: string                 // opcional, usado no marketplace
publishedToMarketplace?: boolean     // default false
marketplaceListingId?: string | null // FK para marketplace/
followsListingId?: string | null     // se é seguidor, aponta para o listing
followsAuthorUserId?: string | null  // userId do autor (para o worker resolver)
clonedFrom?: string | null           // listingId de origem
```

### Campo adicionado em `Recorte`

```
title?: string  // obrigatório para publicar, opcional para uso privado
```

---

## Tipos

**`src/types/clipping.ts`** — adicionar:

```typescript
// Recorte: adicionar title?: string

// Clipping: adicionar description?, publishedToMarketplace?, marketplaceListingId?,
//   followsListingId?, followsAuthorUserId?, clonedFrom?

// Novo tipo:
export type MarketplaceListing = {
  id: string
  authorUserId: string
  authorDisplayName: string
  sourceClippingId: string
  name: string
  description: string
  recortes: Recorte[]
  prompt: string
  likeCount: number
  followerCount: number
  cloneCount: number
  publishedAt: string
  updatedAt: string
  active: boolean
}
```

---

## Validação

**`src/lib/clipping-validation.ts`**:
- `RecorteSchema`: adicionar `title: z.string().max(100).optional()`
- `ClippingPayloadSchema`: adicionar `description: z.string().max(500).optional()`
- Novo `PublishToMarketplaceSchema`: exige `description` e `title` em cada recorte

---

## API Routes

### Phase 1

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/marketplace` | Não | Listar clippings publicados (paginado, sort por likeCount ou publishedAt) |
| GET | `/api/marketplace/[listingId]` | Não | Detalhe de um listing |
| POST | `/api/marketplace/publish` | Sim | Publicar clipping no marketplace (body: `{ clippingId, description }`) |
| DELETE | `/api/marketplace/[listingId]` | Sim | Despublicar (apenas autor) |
| POST | `/api/marketplace/[listingId]/follow` | Sim | Seguir — cria clipping seguidor (body: `{ scheduleTime, deliveryChannels }`) |
| DELETE | `/api/marketplace/[listingId]/follow` | Sim | Deixar de seguir — deleta clipping seguidor |

### Phase 2

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/marketplace/[listingId]/like` | Sim | Toggle like |
| POST | `/api/marketplace/[listingId]/clone` | Sim | Clonar para conta do usuário |

---

## Páginas

| Rota | Tipo | Descrição |
|------|------|-----------|
| `(public)/marketplace/page.tsx` | Server | Grid paginado de listings. Sort: Popular / Recente. Filtro por tema/agência |
| `(public)/marketplace/[listingId]/page.tsx` | Server+Client | Detalhe: recortes com títulos, descrição, contadores. Botões Follow/Clone/Like |

---

## Componentes novos

| Componente | Propósito |
|------------|-----------|
| `MarketplaceCard` | Card para grid: nome, descrição, tags dos recortes, contadores (likes, seguidores, clones) |
| `FollowDialog` | Dialog ao seguir: `ScheduleSelect` + `ChannelSelector` (reutilizar existentes) |
| `PublishDialog` | Dialog para publicar: preencher description + title nos recortes. Preview do listing |

---

## Alterações em arquivos existentes

| Arquivo | Mudança |
|---------|---------|
| `src/types/clipping.ts` | Novos tipos e campos |
| `src/lib/clipping-validation.ts` | title, description, PublishToMarketplaceSchema |
| `src/components/clipping/RecorteEditor.tsx` | Input de `title` acima dos filtros |
| `src/components/clipping/ClippingWizard.tsx` | Textarea de `description` no step Recortes |
| `src/components/clipping/ClippingCard.tsx` | Ações "Publicar"/"Despublicar" no dropdown. Badge "Seguindo X" para followers |
| `src/app/api/clipping/[id]/route.ts` | PUT cascateia update para marketplace listing se publicado |
| `src/app/api/clipping/[id]/route.ts` | DELETE cascateia remoção do listing e desativa followers |
| `src/app/api/clipping/route.ts` | Aceitar `description` no POST |
| `src/components/layout/Header.tsx` | Link "Marketplace" na nav |

---

## Worker (Python)

**`clipping/src/clipping/firestore_client.py`** — `_parse_clipping_doc`:

Quando `followsListingId` está presente no doc:
1. Ler `marketplace/{followsListingId}` para obter `recortes` e `prompt` do autor
2. Se listing inativo → skip o clipping seguidor
3. Usar `scheduleTime`, `deliveryChannels`, `extraEmails` do próprio seguidor

Mudança mínima — condicional no parsing do clipping doc. A query `collectionGroup("clippings")` continua igual.

---

## Migração

Nenhuma. Todos os campos novos são opcionais com defaults. Clippings existentes funcionam inalterados. `title` nos recortes só é exigido ao publicar.

---

## Fases de implementação

### Phase 1: MVP Marketplace (Publicar + Navegar + Seguir)

**1A — Backend foundation**
1. Tipos e validação (clipping.ts, clipping-validation.ts)
2. `POST /api/marketplace/publish`
3. `GET /api/marketplace` (paginado)
4. `GET /api/marketplace/[listingId]`
5. `DELETE /api/marketplace/[listingId]` (despublicar)
6. Cascata no `PUT /api/clipping/[id]` → sync marketplace listing
7. Cascata no `DELETE /api/clipping/[id]` → cleanup listing + followers

**1B — Follow**
1. `POST /api/marketplace/[listingId]/follow`
2. `DELETE /api/marketplace/[listingId]/follow`
3. Worker: resolver recortes/prompt de followers

**1C — UI**
1. `title` no RecorteEditor + `description` no ClippingWizard
2. PublishDialog + ações no ClippingCard
3. Marketplace page (grid + paginação)
4. Listing detail page
5. FollowDialog (reusa ScheduleSelect + ChannelSelector)
6. Link Marketplace no Header

### Phase 2: Social (Clone + Like)

**2A — Clone**
1. `POST /api/marketplace/[listingId]/clone`
2. Botão Clone na página de detalhe
3. Badge "Clonado de X" no ClippingCard

**2B — Like**
1. `POST /api/marketplace/[listingId]/like` (toggle)
2. Botão like no MarketplaceCard e detalhe
3. Sort por popularidade usa likeCount

**2C — Descoberta avançada (futuro)**
1. Indexar marketplace no Typesense para busca full-text
2. Filtros por tema/agência na página do marketplace
3. Perfil do autor (todos os listings de um usuário)

---

## Abordagem TDD — Use Cases e Corner Cases

Cada API route/função será desenvolvida com RED → GREEN → REFACTOR. Os testes abaixo devem ser escritos ANTES do código.

### Publish (`POST /api/marketplace/publish`)

**Happy path:**
- Publica clipping com description e title nos recortes → cria doc em marketplace/, seta publishedToMarketplace=true no clipping
- Retorna listingId

**Corner cases:**
- Clipping sem description → 400
- Recorte sem title → 400
- Clipping já publicado → 409 (idempotente ou erro?)
- Clipping de outro usuário → 403
- Clipping inexistente → 404
- Usuário não autenticado → 401
- Clipping que é um follow (followsListingId set) → 400 "Não é possível publicar um clipping que você segue"

### Unpublish (`DELETE /api/marketplace/[listingId]`)

**Happy path:**
- Remove listing, seta publishedToMarketplace=false no clipping do autor

**Corner cases — cascata em seguidores:**
- Listing tem 3 seguidores → todos devem ser desativados (active=false) com motivo
- Listing tem 0 seguidores → apenas remove listing
- Usuário não é o autor → 403
- Listing inexistente → 404
- Listing já inativo → 404 ou idempotente?

### Follow (`POST /api/marketplace/[listingId]/follow`)

**Happy path:**
- Cria clipping seguidor em users/{userId}/clippings/ com followsListingId, scheduleTime e deliveryChannels
- Incrementa followerCount no listing

**Corner cases:**
- Usuário já segue este listing → 409 "Você já segue este clipping"
- Usuário tenta seguir o próprio clipping publicado → 400 "Você não pode seguir seu próprio clipping"
- Listing inexistente → 404
- Listing inativo (despublicado) → 404 "Clipping não está mais disponível"
- Usuário atingiu limite de 10 clippings → 400 "Limite de clippings atingido"
- Usuário não autenticado → 401
- scheduleTime inválido → 400
- Nenhum deliveryChannel selecionado → 400

### Unfollow (`DELETE /api/marketplace/[listingId]/follow`)

**Happy path:**
- Deleta clipping seguidor, decrementa followerCount no listing

**Corner cases:**
- Usuário não segue este listing → 404
- Listing inexistente (autor despublicou) → ainda deleta o clipping seguidor local
- followerCount não fica negativo (min 0)

### Like (`POST /api/marketplace/[listingId]/like`)

**Happy path:**
- Toggle: se não curtiu → cria like doc + increment likeCount. Se já curtiu → deleta like doc + decrement likeCount
- Retorna `{ liked: boolean, likeCount: number }`

**Corner cases:**
- Listing inexistente → 404
- Listing inativo → 404
- Usuário não autenticado → 401
- Double-click rápido (race condition) → likeCount deve ser consistente (FieldValue.increment é atômico)
- Curtir próprio clipping → permitido (sem restrição)

### Clone (`POST /api/marketplace/[listingId]/clone`)

**Happy path:**
- Cria cópia independente em users/{userId}/clippings/ com clonedFrom=listingId
- Incrementa cloneCount no listing
- Retorna o clipping criado

**Corner cases:**
- Limite de 10 clippings atingido → 400
- Listing inexistente → 404
- Listing inativo → 404
- Clonar o próprio clipping publicado → permitido (cria cópia independente)
- Clonar um clone → permitido (clonedFrom aponta para o listing original, não para o clone)

### Edição de clipping publicado (`PUT /api/clipping/[id]`)

**Corner cases de cascata:**
- Autor edita recortes → marketplace listing atualizado automaticamente
- Autor edita name/description → marketplace listing atualizado
- Autor edita prompt → marketplace listing atualizado
- Autor edita scheduleTime/deliveryChannels → NÃO propaga (são do autor, não dos seguidores)
- Autor remove todos os recortes → validação impede (min 1 recorte)

### Deleção de clipping publicado (`DELETE /api/clipping/[id]`)

**Corner cases de cascata:**
- Clipping publicado é deletado → listing removido + todos os seguidores desativados
- Seguidores recebem indicação visual de que o clipping de origem foi removido
- Worker encontra seguidor com listing inativo → skip, não envia digest

### Worker — dispatch de clipping seguidor

**Happy path:**
- followsListingId presente → lê listing → usa recortes e prompt do listing → usa schedule/channels do seguidor

**Corner cases:**
- Listing existe mas está inativo → skip, log warning
- Listing não existe (deletado) → skip, log warning, desativa clipping seguidor
- Listing existe mas recortes estão vazios (edge case) → skip
- Autor mudou recortes entre dois dispatches → seguidor usa versão mais recente automaticamente
- Múltiplos seguidores do mesmo listing no mesmo slot → cada um gera seu próprio digest (com canais/schedule independentes)

### GET /api/marketplace (listagem)

**Corner cases:**
- Marketplace vazio → retorna lista vazia
- Paginação: page=1 retorna primeiros N, page=2 retorna próximos N
- Sort por likeCount desc → listings mais curtidos primeiro
- Sort por publishedAt desc → mais recentes primeiro
- Listing inativo não aparece na listagem
- Listing com followerCount=0 e likeCount=0 aparece normalmente

### Validação de campos novos

**title no Recorte:**
- Aceita string vazia ao salvar clipping privado (não publicado)
- Rejeita string vazia ao publicar
- Max 100 chars
- Caracteres especiais permitidos

**description no Clipping:**
- Aceita string vazia ao salvar clipping privado
- Rejeita string vazia ao publicar
- Max 500 chars

---

## Verificação

### Testes automatizados (TDD)
- Cada API route tem arquivo de teste em `__tests__/route.test.ts`
- Cada função de lib tem testes unitários
- Worker: testes para `_parse_clipping_doc` com followsListingId
- Total estimado: ~40-50 testes novos

### Testes manuais via preview deploy
1. Criar clipping com description + title → publicar → aparece no marketplace
2. Outro usuário segue → clipping seguidor criado
3. Autor edita recortes → listing atualizado
4. Autor despublica → seguidores desativados
5. Worker: seguidor recebe digest com recortes do autor
6. Like toggle funciona, contadores atualizados
7. Clone cria cópia independente
