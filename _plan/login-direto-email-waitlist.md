# Login direto para usuários existentes + Email na aprovação de waitlist

## Contexto

O botão "Entrar" redireciona SEMPRE para `/convite`, forçando até usuários que já têm conta a passar pela tela de convite. Isso é ruim para UX. Além disso, quando o admin aprova alguém da waitlist, o código de convite é gerado mas nunca enviado ao usuário — o admin precisa copiar e enviar manualmente.

**Duas mudanças:**
1. Login direto para quem já tem conta (bypass do gate de convite)
2. Email automático com código de convite na aprovação da waitlist

## 1. Login Direto para Usuários Existentes

### Problema atual

```
AuthButton "Entrar" → /convite (sempre) → input de código → OAuth → /convite/[code]/redeem → home
```

Quem já tem conta precisa de um código que não tem/precisa.

### Solução: Post-login callback inteligente

```
AuthButton "Entrar" → signIn() → OAuth → /auth/postlogin →
  ├─ Tem perfil no Firestore? → home ✓
  ├─ É admin (Keycloak role)? → cria perfil → home ✓
  └─ Sem perfil e sem role? → /convite (precisa de convite)
```

O fluxo de convite para novos usuários continua igual:
```
/convite/[code] → "Entrar" → OAuth → /convite/[code]/redeem → cria perfil → home
```

### Arquivos a modificar/criar

| Arquivo | Ação | Mudança |
|---------|------|---------|
| `src/components/auth/AuthButton.tsx` | Modificar | "Entrar" chama `signIn(undefined, { callbackUrl: '/auth/postlogin' })` em vez de `router.push('/convite')` |
| `src/app/auth/postlogin/page.tsx` | **Criar** | Server component: verifica perfil no Firestore, redireciona conforme lógica acima |
| `src/app/auth/postlogin/__tests__/page.test.ts` | **Criar** | Testes: com perfil → home, admin sem perfil → cria + home, sem perfil → /convite |

### Lógica de `/auth/postlogin/page.tsx`

```typescript
export default async function PostLoginPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/convite')

  const db = getFirestoreDb()
  const userDoc = await db.collection('users').doc(session.user.id).get()

  // Já tem conta → home
  if (userDoc.exists) redirect('/')

  // Admin sem conta → cria perfil e vai pra home
  if (await isAdmin()) {
    await db.collection('users').doc(session.user.id).set({
      invitedBy: null,
      inviteCode: null,
      inviteCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'admin',
      name: session.user.name,
      email: session.user.email,
    })
    redirect('/')
  }

  // Novo user sem convite → precisa de convite
  redirect('/convite')
}
```

**Nota:** A rota `/convite/admin` continua existindo como alternativa explícita para admins.

## 2. Email na Aprovação da Waitlist

### Padrão existente (repo clipping)

O clipping usa **SendGrid** (`@sendgrid/mail` / Python `sendgrid`):
- `SendGridAPIClient` com API key via env var
- HTML templates com branding gov.br
- Erros logados mas não bloqueiam o fluxo
- API key em GCP Secret Manager

### Implementação no portal

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/email.ts` | **Criar** | Utility: `sendEmail({ to, subject, html })` via SendGrid REST API |
| `src/lib/__tests__/email.test.ts` | **Criar** | Testes com mock de fetch |
| `src/lib/email-templates.ts` | **Criar** | `renderWaitlistApprovalEmail({ name, code, portalUrl })` → HTML string |
| `src/lib/__tests__/email-templates.test.ts` | **Criar** | Testa que template contém código, nome, URL |
| `src/app/(admin)/admin/convites/actions.ts` | Modificar | `approveEntry`: após batch commit, chama `sendEmail` com template de aprovação |
| `.env.example` | Modificar | Adicionar `SENDGRID_API_KEY=`, `EMAIL_FROM_ADDRESS=` |

### `src/lib/email.ts` — Utility

Usa `fetch` direto na API do SendGrid (sem dependência extra):

```typescript
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

export async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.warn('[email] SENDGRID_API_KEY not set, skipping email')
    return
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: process.env.EMAIL_FROM_ADDRESS ?? 'noreply@destaquesgovbr.gov.br',
        name: 'Destaques Gov.br',
      },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!response.ok) {
    console.error('[email] SendGrid error:', response.status, await response.text())
  }
}
```

**Decisão: `fetch` direto em vez de `@sendgrid/mail`** — evita dependência, o portal já usa fetch para tudo, e a API do SendGrid é simples (um POST).

### `src/lib/email-templates.ts` — Template de aprovação

HTML simples com branding gov.br (cores do `digest_renderer.py` do clipping):
- Header azul gov.br (`#1351b4`)
- Mensagem: "Olá {nome}, seu acesso ao Destaques Gov.br foi aprovado!"
- Código de convite em destaque
- Link direto: `{portalUrl}/convite/{code}`
- Footer com texto institucional

### Modificação em `approveEntry`

```typescript
// Após batch.commit() (linha ~80):
try {
  const html = renderWaitlistApprovalEmail({
    name: data.name ?? undefined,
    code: inviteCode,
    portalUrl: process.env.AUTH_URL ?? 'https://destaquesgovbr.gov.br',
  })
  await sendEmail({
    to: data.email,
    subject: 'Seu acesso ao Destaques Gov.br foi aprovado!',
    html,
  })
} catch (error) {
  // Log mas não bloqueia — a aprovação já foi salva
  console.error('[waitlist] Failed to send approval email:', error)
}
```

### Deploy: env vars e secrets

Adicionar ao deploy-preview.yml e deploy-preview-update.yml:
```yaml
--set-env-vars "...,EMAIL_FROM_ADDRESS=noreply@destaquesgovbr.gov.br"
--set-secrets "...,SENDGRID_API_KEY=sendgrid-api-key:latest"
```

**Infra (repo `destaquesgovbr/infra`, via Terraform com PR):**
- Secret `sendgrid-api-key` no GCP Secret Manager
- IAM: SA do portal-staging precisa de acesso ao secret
- Env var `SENDGRID_API_KEY` e `EMAIL_FROM_ADDRESS` nos Cloud Run services do portal

## Ordem de Implementação (TDD)

1. **`src/lib/email.ts`** + testes — utility de envio
2. **`src/lib/email-templates.ts`** + testes — template HTML
3. **`src/app/(admin)/admin/convites/actions.ts`** — integrar email no `approveEntry`
4. **`src/app/auth/postlogin/page.tsx`** + testes — callback inteligente
5. **`src/components/auth/AuthButton.tsx`** — mudar "Entrar" para signIn direto
6. **Deploy config** — env vars nos workflows
7. **Terraform** — secret + IAM no repo infra (PR separado)

## Verificação

1. `pnpm vitest run` — todos os testes passam
2. `pnpm build` — build sem erros TypeScript
3. Fluxo manual:
   - Usuário existente: "Entrar" → OAuth → volta logado (sem passar por /convite)
   - Novo usuário sem convite: "Entrar" → OAuth → redirecionado para /convite
   - Novo usuário com convite: `/convite/[code]` → "Entrar" → OAuth → conta criada → home
   - Admin: "Entrar" → OAuth → perfil criado automaticamente → home
   - Waitlist: admin aprova → email enviado com código → usuário usa o link do email
