# Estratégia Viral de Convites + Lista de Espera

## Contexto

O portal está prestes a ser lançado. O login é gated por convite: apenas quem tem um código válido (ou foi aprovado na waitlist pelo admin) consegue se autenticar. O conteúdo do portal continua público, mas features logadas (push preferences, etc.) ficam atrás do gate. Cada usuário autenticado recebe 5 convites para distribuir. Qualquer pessoa pode entrar na lista de espera.

**Issues relacionadas:**
- #23 — Autenticação Gov.Br (aberta, parcialmente implementada via PRs #81, #98, #99)
- #72 — Criar Área Admin para Controle de Destaques (aberta, pós-lançamento)
- #107 — Header sobrecarregado, proposta de sidebar (aberta — evitaremos poluir o header)

**PRs relacionadas:**
- #104 — Clipping login (aberta, área logada)
- #103 — Restringir admin/preview a autenticados (merged)
- #93 — Push notifications v2 com Firestore (merged)
- #83 — Firestore user data (merged)

**Branch atual:** `signing-in-viral-strategy` (baseada em development, com merges de main)

## Modelo de Dados (Firestore)

### `inviteCodes/{code}` (code = nanoid(8) como document ID → lookup O(1))

```typescript
{
  code: string              // nanoid(8), ex: "Xk9mP2qR"
  createdBy: string         // userId do convidador (ou "admin")
  createdAt: string         // ISO timestamp
  status: 'active' | 'used' | 'revoked'
  usedBy: string | null
  usedAt: string | null
}
```

### `users/{userId}` (estende o doc implícito — hoje só tem subcollection pushPreferences)

```typescript
{
  invitedBy: string | null
  inviteCode: string | null    // código usado para entrar
  inviteCount: number          // convites gerados (max 5)
  joinedAt: string
  role: 'user' | 'admin'
}
```

### `waitlist/{autoId}`

```typescript
{
  email: string               // normalizado lowercase
  name: string | null
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  inviteCodeSent: string | null
}
```

## Dependência Nova

- `nanoid` — gerar códigos curtos e URL-safe (8 chars, ~2.8T combinações)

## Env Var Nova

```env
ADMIN_EMAILS=admin@example.com   # comma-separated, checado server-side
```

## Mecânica Central: Login Gated por Convite

O fluxo de sign-in passa a exigir um código de convite válido. O botão "Entrar" no Header **não faz login direto** — ele redireciona para `/convite` onde o user insere seu código. Exceção: admins (by ADMIN_EMAILS) passam direto.

**Dois caminhos para login:**
1. **Via link de convite** (`/convite/Xk9mP2qR`) — código já está na URL, user só clica "Entrar"
2. **Via input manual** (`/convite`) — user digita o código que recebeu

Após validar o código, o OAuth flow inicia com `callbackUrl` apontando para `/convite/{code}/redeem`, que marca o código como usado e cria o user profile.

## Abordagem TDD

Cada fase segue o ciclo Red → Green → Refactor. Testes são escritos **antes** da implementação.

### Infraestrutura de Testes a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/__tests__/mocks/firebase-admin.ts` | Mock do Firestore (`getFirestoreDb`) — retorna mocks de collection/doc/get/set/update/transaction |
| `src/__tests__/mocks/auth.ts` | Mock do `auth()` de NextAuth — helper para simular sessão autenticada/não-autenticada |

**Padrões existentes a reutilizar:**
- `src/lib/result.ts` → `withResult` e `ResultError` para server actions de leitura
- `src/types/action-state.ts` → `withActionState` e `ActionError` para server actions de mutação (forms)
- `src/__tests__/test-utils.tsx` → `render()` com QueryClient provider
- `src/__tests__/setup.ts` → mocks de next/navigation, next/link, next/image
- Padrão de `vi.mock()` + `vi.spyOn()` já estabelecido nos testes existentes

## Arquivos a Criar/Modificar (com testes TDD)

### Fase 1: Foundation

| Arquivo | Tipo |
|---------|------|
| `src/types/invite.ts` | Criar — tipos InviteCode, WaitlistEntry, UserProfile, schemas Zod |
| `src/lib/admin.ts` | Criar — `isAdmin()`, `requireAdmin()` via ADMIN_EMAILS env |
| `src/lib/__tests__/admin.test.ts` | **TEST FIRST** — testa isAdmin com diferentes emails, env vazia, etc. |
| `src/lib/invite.ts` | Criar — `generateInviteCode()`, helpers Firestore |
| `src/lib/__tests__/invite.test.ts` | **TEST FIRST** — testa geração de código, validação, formato |
| `src/__tests__/mocks/firebase-admin.ts` | Criar — mock factory para Firestore |
| `src/__tests__/mocks/auth.ts` | Criar — mock helper para sessões NextAuth |
| `.env.example` | Modificar — adicionar ADMIN_EMAILS |

### Fase 2: Gate de Convite (`/convite` e `/convite/[code]`)

| Arquivo | Tipo |
|---------|------|
| `src/app/(public)/convite/[code]/__tests__/actions.test.ts` | **TEST FIRST** — validateInviteCode (válido, usado, revogado, inexistente), redeemInviteCode (transação, race condition) |
| `src/app/(public)/convite/[code]/actions.ts` | Criar — `validateInviteCode`, `redeemInviteCode` |
| `src/components/invite/__tests__/InviteCodeInput.test.tsx` | **TEST FIRST** — input aceita código, navega para /convite/{code} |
| `src/components/invite/__tests__/InviteLanding.test.tsx` | **TEST FIRST** — mostra nome do convidador, CTA login, link waitlist |
| `src/app/(public)/convite/page.tsx` | Criar — Página com input |
| `src/app/(public)/convite/[code]/page.tsx` | Criar — Valida código, mostra landing ou erro |
| `src/app/(public)/convite/[code]/redeem/page.tsx` | Criar — Pós-OAuth: redeem + redirect |
| `src/components/invite/InviteLanding.tsx` | Criar |
| `src/components/invite/InviteCodeInput.tsx` | Criar |

### Fase 3: Modificar AuthButton

| Arquivo | Tipo |
|---------|------|
| `src/components/auth/__tests__/AuthButton.test.tsx` | **TEST FIRST** — verifica que botão "Entrar" redireciona para `/convite` |
| `src/components/auth/AuthButton.tsx` | Modificar — `router.push('/convite')` em vez de `signIn('govbr')` |

### Fase 4: Lista de Espera (`/lista-espera`)

| Arquivo | Tipo |
|---------|------|
| `src/app/(public)/lista-espera/__tests__/actions.test.ts` | **TEST FIRST** — submitToWaitlist: sucesso, duplicata, validação email |
| `src/app/(public)/lista-espera/actions.ts` | Criar — `submitToWaitlist` com `withActionState` |
| `src/components/waitlist/__tests__/WaitlistForm.test.tsx` | **TEST FIRST** — renderiza form, valida email, mostra erro, mostra sucesso |
| `src/components/waitlist/WaitlistForm.tsx` | Criar — react-hook-form + zod + sonner |
| `src/app/(public)/lista-espera/page.tsx` | Criar — Server Component |

### Fase 5: Meus Convites (`/convites`)

| Arquivo | Tipo |
|---------|------|
| `src/app/(public)/convites/__tests__/actions.test.ts` | **TEST FIRST** — getUserInvites, createInviteCode (sucesso, limite atingido), revokeInviteCode |
| `src/app/(public)/convites/actions.ts` | Criar — server actions |
| `src/components/invite/__tests__/InviteList.test.tsx` | **TEST FIRST** — lista códigos, badges de status, botão copiar |
| `src/components/invite/__tests__/GenerateInviteButton.test.tsx` | **TEST FIRST** — desabilita no limite, chama action |
| `src/components/invite/InviteList.tsx` | Criar |
| `src/components/invite/GenerateInviteButton.tsx` | Criar |
| `src/app/(public)/convites/page.tsx` | Criar — protegido por auth |

### Fase 6: Admin (`/admin/convites`)

| Arquivo | Tipo |
|---------|------|
| `src/app/(admin)/admin/convites/__tests__/actions.test.ts` | **TEST FIRST** — getWaitlistEntries, approveEntry, rejectEntry, getInviteStats, bloqueia não-admin |
| `src/app/(admin)/admin/convites/actions.ts` | Criar |
| `src/components/admin/__tests__/WaitlistManager.test.tsx` | **TEST FIRST** — tabs, tabela, ações approve/reject |
| `src/components/admin/WaitlistManager.tsx` | Criar |
| `src/components/admin/InviteStatsCards.tsx` | Criar |
| `src/app/(admin)/admin/convites/page.tsx` | Criar |

### Fase 7: Header + Auth

| Arquivo | Tipo |
|---------|------|
| `src/auth.ts` | Modificar — criar user profile no primeiro login |
| `src/components/layout/Header.tsx` | Modificar — link "Convites" para autenticados (respeitando issue #107 sobre header sobrecarregado — minimal: apenas no dropdown do avatar) |

## Segurança

- **Gate de convite**: AuthButton redireciona para `/convite` — login só acontece via convite válido
- **Admin bypass**: admins (ADMIN_EMAILS) podem logar direto, sem convite — a página `/convite` detecta admin email e pula o gate
- **Admin panel**: checado server-side em toda action/page via `requireAdmin()`
- **Atomicidade**: redeem usa Firestore transaction (evita race condition de dois redeems simultâneos)
- **Limite de convites**: `FieldValue.increment(1)` no mesmo batch da criação do código
- **Validação**: todos inputs via zod schemas, emails normalizados lowercase
- **Códigos aleatórios**: nanoid, não derivados de dados do user

## Ordem de Implementação (TDD)

Cada fase: escrever testes → rodar (RED) → implementar (GREEN) → refatorar.

1. **Foundation** — mocks de teste, tipos, lib/admin (com testes), lib/invite (com testes), nanoid, env var
2. **Gate de convite** — testes de actions → actions → testes de components → components → pages
3. **AuthButton** — teste que verifica redirect → modificar componente
4. **Lista de Espera** — testes de actions → actions → testes de form → form → page
5. **Meus Convites** — testes de actions → actions → testes de components → components → page
6. **Admin** — testes de actions → actions → testes de components → components → page
7. **Header + Auth** — modificar auth.ts (user profile), link no dropdown do avatar

## Verificação

```bash
# Rodar todos os testes unitários
pnpm test:unit

# Rodar com coverage
pnpm test:coverage

# Build sem erros TypeScript
pnpm build

# Lint
pnpm lint
```

**Cenários a validar:**
- Botão "Entrar" redireciona para `/convite` (não faz login direto)
- Código válido mostra landing com nome do convidador
- Código usado/revogado/inexistente mostra erro
- Signup via convite end-to-end (gerar → compartilhar link → redimir → login)
- Input manual de código
- Limite de 5 convites por user
- Duplicata de email na lista de espera
- Aprovação/rejeição no admin
- Admin consegue logar sem convite
- Não-admin bloqueado no painel
