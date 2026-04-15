# Plano: Promover a landing para home (`/`) e mover a home atual para `/noticias`

## Context

A landing `/para-orgaos` que acabamos de construir representa o novo posicionamento estratégico do DGB: **plataforma para órgãos**, não portal de busca para cidadãos. Hoje, a home (`/`) é uma agregadora de notícias (hero + latest + temas) — um "rosto" desalinhado com essa nova narrativa.

Como nada do DGB foi lançado publicamente, não há necessidade de preservar links antigos nem criar redirects. A mudança é uma reestruturação livre:

1. A landing passa a ser a home (`/`).
2. A home atual (agregadora de notícias) passa a ser `/noticias`.
3. O showcase `/para-orgaos/web-difusora` passa a ser `/web-difusora`.
4. O diretório `para-orgaos/` é eliminado.
5. O menu principal é ajustado: "Para Órgãos" sai; "Notícias" passa a apontar para `/noticias`.

Objetivo: alinhar a primeira impressão do DGB com a estratégia "Web Difusora para órgãos" e eliminar a ambiguidade do duplo público.

---

## Ajustes de copy no Hero

Além das mudanças de rota, dois ajustes no Hero da nova home (`src/app/(public)/page.tsx`):

1. **CTA secundário** muda de `Ver demonstração` → `/para-orgaos/web-difusora` para `Explorar notícias →` → `/noticias`. O showcase já é acessado pela seção "Showcase teaser" mais abaixo, tornando o link no Hero redundante.
2. O `eyebrow` "Para órgãos do governo federal" pode ficar — ele contextualiza o público-alvo sem precisar de menu.

---

## Movimentação de arquivos

| De | Para | Observações |
|---|---|---|
| `src/app/(public)/page.tsx` | `src/app/(public)/noticias/page.tsx` | Atualizar `from './actions'` → `from '../actions'` (linha 14). O arquivo `actions.ts` permanece em `src/app/(public)/actions.ts` |
| `src/app/(public)/para-orgaos/page.tsx` | `src/app/(public)/page.tsx` | Atualizar import `from './stats'` → `from '@/lib/landing-stats'` |
| `src/app/(public)/para-orgaos/stats.ts` | `src/lib/landing-stats.ts` | Promove para lib global; fica independente da rota |
| `src/app/(public)/para-orgaos/web-difusora/page.tsx` | `src/app/(public)/web-difusora/page.tsx` | Atualiza 2 back-links internos: `href="/para-orgaos"` → `href="/"` |
| `src/app/(public)/para-orgaos/` (diretório) | **DELETAR** | Após moves acima, diretório fica vazio |

---

## Arquivos a editar (sem move)

### `src/components/layout/Header.tsx` (linhas 14-19)

**De:**
```tsx
const routeLinks = [
  { href: '/artigos', label: 'Notícias' },
  { href: '/orgaos', label: 'Órgãos' },
  { href: '/temas', label: 'Temas' },
  { href: '/para-orgaos', label: 'Para Órgãos' },
]
```

**Para:**
```tsx
const routeLinks = [
  { href: '/noticias', label: 'Notícias' },
  { href: '/orgaos', label: 'Órgãos' },
  { href: '/temas', label: 'Temas' },
]
```

Nota: `/artigos` continua existindo como rota de listagem filtrável — só perde o link direto no menu. É acessível via drill-down de temas, órgãos e busca.

### `src/app/(public)/page.tsx` (novo conteúdo, pós-move)

Dois ajustes no bloco do Hero:

1. Linha do `secondaryCta`: trocar `{ label: 'Ver demonstração', href: '/para-orgaos/web-difusora' }` por `{ label: 'Explorar notícias', href: '/noticias' }`.
2. Linha do `showcase teaser` (Seção 5): trocar `href="/para-orgaos/web-difusora"` por `href="/web-difusora"`.
3. Atualizar o import `from './stats'` → `from '@/lib/landing-stats'`.

### `src/app/(public)/web-difusora/page.tsx` (novo conteúdo, pós-move)

- Linha 26 (back link superior): `href="/para-orgaos"` → `href="/"`
- Texto do back link: "Voltar para Para Órgãos" → "Voltar para a home"
- Linha 124 (back link do CTA final): `href="/para-orgaos"` → `href="/"`
- Texto do botão: "Voltar para Para Órgãos" → "Voltar para a home"

### `src/lib/landing-stats.ts` (novo arquivo)

Conteúdo idêntico ao atual `src/app/(public)/para-orgaos/stats.ts`. O comentário na linha 40 ("Stats for the /para-orgaos landing page") deve ser atualizado para "Stats for the home landing page".

---

## Atualização de testes E2E

### `e2e/home.spec.ts`

Os testes atuais fazem `page.goto('/')` e procuram cards de notícia. Após o move, `/` é a landing — os seletores não existem mais. Três opções, todas equivalentes:

**Escolhido**: reescrever o arquivo para testar a nova home (landing), movendo os testes da home de notícias para um novo `e2e/noticias.spec.ts`:

- `e2e/home.spec.ts` → testa `/` = landing. Asserts similares ao que já existe em `para-orgaos-smoke.spec.ts` (heading "Web Difusora do governo federal", seções "Dois fluxos", "Em desenvolvimento").
- `e2e/noticias.spec.ts` (novo) → testa `/noticias`. Asserts que eram do `home.spec.ts` antigo (cards de notícia, header, navegação para busca).

### `e2e/para-orgaos-smoke.spec.ts` → `e2e/landing-smoke.spec.ts`

- Renomeia o arquivo.
- Troca `'/para-orgaos'` por `'/'`.
- Troca `'/para-orgaos/web-difusora'` por `'/web-difusora'`.
- Troca o teste "header has Para Órgãos link" por "header has Notícias link pointing to /noticias".

---

## Sequência de implementação

1. **Mover e adaptar `landing-stats`**: criar `src/lib/landing-stats.ts` com o conteúdo atual de `para-orgaos/stats.ts`.
2. **Mover home atual**: criar `src/app/(public)/noticias/page.tsx` copiando `src/app/(public)/page.tsx`, ajustando o import relativo `./actions` → `../actions`.
3. **Mover showcase**: criar `src/app/(public)/web-difusora/page.tsx` copiando `para-orgaos/web-difusora/page.tsx`, ajustando os back-links para `/`.
4. **Substituir home por landing**: sobrescrever `src/app/(public)/page.tsx` com o conteúdo atual de `para-orgaos/page.tsx`, aplicando os ajustes de CTA secundário, link do showcase teaser e import do stats.
5. **Deletar o diretório `src/app/(public)/para-orgaos/`** completo.
6. **Atualizar Header**: remover link "Para Órgãos", trocar href de "Notícias" para `/noticias`.
7. **Atualizar testes E2E**: reescrever `home.spec.ts` + criar `noticias.spec.ts` + renomear `para-orgaos-smoke.spec.ts`.
8. **Atualizar o plano documentado** em `portal/_plan/plano-landing-para-orgaos.md` para refletir a nova estrutura (opcional, mas útil para histórico).

---

## Verificação

```bash
# Type check (zero erros novos — todos os imports devem resolver)
cd portal && npx tsc --noEmit 2>&1 | grep -v "pubsub\|@google-cloud\|lista-espera\|telegram/__tests__\|punycode"

# Dev server (reiniciar para pegar mudanças de estrutura)
lsof -ti:3000 | xargs kill -9; pnpm dev

# HTTP smoke test
curl -s -o /dev/null -w "%{http_code} /\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} /noticias\n" http://localhost:3000/noticias
curl -s -o /dev/null -w "%{http_code} /web-difusora\n" http://localhost:3000/web-difusora
curl -s -o /dev/null -w "%{http_code} /para-orgaos\n" http://localhost:3000/para-orgaos  # deve retornar 404

# Validar que a home tem o título da landing
curl -s http://localhost:3000/ | grep -o "Web Difusora do governo federal"

# Validar que /noticias tem o conteúdo do feed
curl -s http://localhost:3000/noticias | grep -o 'href="/artigos/' | head -3

# E2E
E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/home.spec.ts e2e/noticias.spec.ts e2e/landing-smoke.spec.ts --project=chromium --reporter=line

# Manual:
# 1. GET / → landing com hero "A Web Difusora do governo federal"
# 2. Clicar "Explorar notícias" no hero → /noticias com a home antiga
# 3. Clicar "Ver a demonstração completa" na seção showcase → /web-difusora
# 4. No /web-difusora, clicar "Voltar para a home" → /
# 5. No header, clicar "Notícias" → /noticias
# 6. Confirmar que "Para Órgãos" sumiu do menu
# 7. Confirmar que as 4 stats clicáveis continuam funcionando
```

---

## Arquivos críticos

| Arquivo | Papel |
|---|---|
| `src/app/(public)/page.tsx` | **Novo home** — antigo `para-orgaos/page.tsx` |
| `src/app/(public)/noticias/page.tsx` | **Novo** — antigo `page.tsx` (news aggregator) |
| `src/app/(public)/web-difusora/page.tsx` | **Novo** — antigo `para-orgaos/web-difusora/page.tsx` |
| `src/lib/landing-stats.ts` | **Novo** — antigo `para-orgaos/stats.ts` |
| `src/components/layout/Header.tsx` | Ajuste no `routeLinks` |
| `src/app/(public)/actions.ts` | Sem mudança — permanece no lugar original |
| `src/components/landing/*` | Sem mudança — componentes já existem |
| `e2e/home.spec.ts` | Reescrita para testar nova home |
| `e2e/noticias.spec.ts` | **Novo** — testes da home antiga no novo endereço |
| `e2e/landing-smoke.spec.ts` | Renomeado de `para-orgaos-smoke.spec.ts` |
