---
description: Checklist completo para adicionar uma nova variável de ambiente, garantindo que funcione em produção
trigger: variável de ambiente, env var, adicionar variável, configurar variável, nova variável
---

# Skill: Adicionar Variável de Ambiente

Use esta skill sempre que precisar adicionar uma nova variável de ambiente ao projeto portal.

## Contexto

Este projeto teve múltiplos incidentes onde variáveis de ambiente não foram configuradas em todos os lugares necessários, resultando em funcionalidades quebradas em produção (ex: `CLIPPING_WORKER_URL`, variáveis de autenticação).

Esta skill garante que **todas as 8 etapas** sejam concluídas para que a variável funcione corretamente em todos os ambientes.

## Checklist Obrigatório

Quando adicionar uma nova variável de ambiente, siga TODAS as etapas:

### 1. Documentação

- [ ] **`.env.example`** — Adicionar variável com:
  - Nome da variável
  - Descrição clara do propósito
  - Exemplo de valor (quando aplicável)
  - Indicação se é obrigatória ou opcional
  
- [ ] **`CLAUDE.md`** — Documentar na seção "Variáveis de Ambiente":
  - Para que serve
  - Quando é necessária
  - Impacto se não estiver configurada
  - Valores para dev/staging/produção

### 2. Desenvolvimento Local

- [ ] **`.env.local`** — Adicionar valor para desenvolvimento local (se aplicável)
- [ ] Testar localmente com `pnpm dev` para confirmar que funciona

### 3. Docker Build

**IMPORTANTE**: Variáveis precisam estar disponíveis durante o build OU em runtime.

- [ ] **`Dockerfile`** — Se a variável é necessária em **build time** (ex: `NEXT_PUBLIC_*`):
  - Adicionar `ARG NOME_DA_VARIAVEL`
  - Adicionar `ENV NOME_DA_VARIAVEL=$NOME_DA_VARIAVEL`

- [ ] Se a variável é necessária apenas em **runtime** (backend), não precisa estar no Dockerfile (vai via Cloud Run env vars)

### 4. Workflows CI/CD (Build Args)

**Aplicar em TODOS os 4 workflows**:

- [ ] **`.github/workflows/deploy-production.yml`** — Adicionar `--build-arg NOME_DA_VARIAVEL="${{ secrets.NOME_DA_VARIAVEL }}"`
- [ ] **`.github/workflows/deploy-staging.yml`** — Adicionar `--build-arg NOME_DA_VARIAVEL="${{ secrets.NOME_DA_VARIAVEL }}"`
- [ ] **`.github/workflows/deploy-preview.yml`** — Adicionar `--build-arg NOME_DA_VARIAVEL="${{ secrets.NOME_DA_VARIAVEL }}"`
- [ ] **`.github/workflows/deploy-preview-update.yml`** — Adicionar `--build-arg NOME_DA_VARIAVEL="${{ secrets.NOME_DA_VARIAVEL }}"`

**Nota**: Apenas para variáveis que precisam estar no build (Dockerfile). Se a variável é apenas runtime, adicionar apenas nos `--set-env-vars` dos previews.

### 5. GitHub Secrets

- [ ] **Repository Secrets** — Adicionar secret no GitHub:
  ```bash
  gh secret set NOME_DA_VARIAVEL --body "valor-da-variavel"
  ```
  
  Ou via interface: Settings → Secrets and variables → Actions → New repository secret

### 6. Terraform (Produção e Staging)

- [ ] **`terraform/portal.tf`** — Adicionar env var no recurso `google_cloud_run_v2_service.portal`:
  ```hcl
  env {
    name  = "NOME_DA_VARIAVEL"
    value = "valor" # ou referência a outro recurso/secret
  }
  ```

- [ ] **`terraform/portal.tf`** — Adicionar também no recurso `google_cloud_run_v2_service.portal_staging`

- [ ] **Aplicar Terraform**:
  ```bash
  cd /caminho/para/infra
  terraform plan
  terraform apply
  ```

  **OU** aguardar próximo apply automático se preferir

### 7. Preview Deploys (opcional)

Se a variável deve estar disponível em preview deploys:

- [ ] **`.github/workflows/deploy-preview.yml`** — Adicionar em `--set-env-vars`:
  ```yaml
  --set-env-vars "NOME_DA_VARIAVEL=valor,..."
  ```

- [ ] **`.github/workflows/deploy-preview-update.yml`** — Adicionar em `--set-env-vars` também

### 8. Validação

- [ ] **Desenvolvimento**: `pnpm dev` funciona com a variável
- [ ] **Build**: `pnpm build` passa sem erros
- [ ] **Staging**: Deploy de staging funciona e feature opera corretamente
- [ ] **Produção**: Deploy de produção funciona e feature opera corretamente

## Tipos de Variáveis

### Variáveis Públicas (Client-Side)

Prefixo: `NEXT_PUBLIC_*`

- Embutidas no bundle JavaScript
- Visíveis no navegador
- **Devem** estar no Dockerfile como build arg
- Exemplo: `NEXT_PUBLIC_TYPESENSE_HOST`

### Variáveis Privadas (Server-Side)

Sem prefixo especial

- Disponíveis apenas no backend
- **Não devem** estar no Dockerfile (build arg)
- Passadas via Cloud Run env vars (Terraform ou `--set-env-vars`)
- Exemplo: `CLIPPING_WORKER_URL`, `AUTH_SECRET`

### Secrets Sensíveis

Via Secret Manager:

- Não embutir valores diretamente no Terraform
- Usar `google_secret_manager_secret` e referenciar:
  ```hcl
  env {
    name = "API_KEY"
    value_source {
      secret_key_ref {
        secret  = google_secret_manager_secret.api_key.secret_id
        version = "latest"
      }
    }
  }
  ```

## Exemplo Completo

Cenário: Adicionar `NOTIFICATIONS_API_URL` (backend, não-sensível)

```bash
# 1. Documentação
# Adicionar em .env.example:
NOTIFICATIONS_API_URL=http://localhost:9000

# Adicionar em CLAUDE.md seção de env vars

# 2. Não adicionar ao Dockerfile (é runtime)

# 3. Adicionar aos 4 workflows como --build-arg (não aplicável para runtime-only)

# 4. Adicionar secret no GitHub
gh secret set NOTIFICATIONS_API_URL --body "https://notifications-api-xxxxx.run.app"

# 5. Editar terraform/portal.tf
# Adicionar em google_cloud_run_v2_service.portal e .portal_staging:
env {
  name  = "NOTIFICATIONS_API_URL"
  value = google_cloud_run_v2_service.notifications_api.uri
}

# 6. Aplicar Terraform
cd /caminho/para/infra
terraform apply

# 7. (Opcional) Adicionar em preview deploys se necessário

# 8. Validar em todos os ambientes
```

## Troubleshooting

### "Variável não está disponível em produção"
- Confirme que está no Terraform e que foi aplicado (`terraform apply`)
- Verifique se Cloud Run tem a env var: `gcloud run services describe NOME_DO_SERVICO --format='get(spec.template.spec.containers[0].env)'`

### "Variável undefined durante build"
- Confirme que está no Dockerfile como `ARG` e `ENV`
- Confirme que workflows passam `--build-arg` com valor do secret

### "Variável não disponível em preview deploy"
- Confirme que está em `--set-env-vars` nos workflows de preview

### "Variável funciona em dev mas não em produção"
- Provavelmente falta no Terraform ou não foi aplicado
- Se for `NEXT_PUBLIC_*`, pode estar faltando como build arg nos workflows

## Comandos Úteis

```bash
# Ver env vars em um Cloud Run service
gcloud run services describe NOME_DO_SERVICO \
  --region REGIAO \
  --format='get(spec.template.spec.containers[0].env)'

# Atualizar env var manualmente (temporário, será sobrescrito pelo Terraform)
gcloud run services update NOME_DO_SERVICO \
  --region REGIAO \
  --update-env-vars NOME_DA_VARIAVEL=valor

# Listar secrets do GitHub
gh secret list

# Adicionar secret no GitHub
gh secret set NOME_DA_VARIAVEL --body "valor"

# Ver secrets do Secret Manager (GCP)
gcloud secrets list
```

## Notas Importantes

1. **Terraform é a fonte da verdade para produção e staging** — mudanças manuais via `gcloud` são temporárias
2. **Sempre documentar** — `.env.example` e `CLAUDE.md` são essenciais para novos desenvolvedores
3. **Testar em staging antes de produção** — evita surpresas
4. **Variáveis `NEXT_PUBLIC_*` devem estar no build** — não funcionam se adicionadas apenas em runtime
5. **Secrets sensíveis devem usar Secret Manager** — nunca commitar valores no código

## Quando Usar Esta Skill

- Ao adicionar qualquer nova variável de ambiente
- Ao revisar PRs que adicionam variáveis
- Ao debugar problemas de "variável não configurada"
- Ao onboarding de novos desenvolvedores que precisam configurar env vars
