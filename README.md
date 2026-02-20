# Portal DestaquesGovBr

[![Licença: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Este é um projeto [Next.js](https://nextjs.org) criado com [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Primeiros Passos

### 1. Executar o Typesense localmente

Primeiro, inicie o servidor Typesense. Neste repositório você encontrará um container Docker e um script `run-typesense-server.sh` que executa o container e carrega o dataset de notícias do Huggingface: https://github.com/destaquesgovbr/typesense

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env.local
```

Atualize seu arquivo `.env.local` com a chave de API para desenvolvimento local:

```env
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY=govbrnews_api_key_change_in_production
```

### 3. Executar o servidor de desenvolvimento

```bash
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

## Testes

Este projeto usa **Vitest** para testes unitários/integração e **Playwright** para testes E2E.

### Executando Testes

```bash
# Executar testes unitários em modo watch
pnpm test

# Executar testes unitários uma vez
pnpm test:unit

# Executar testes com relatório de cobertura
pnpm test:coverage

# Abrir interface do Vitest
pnpm test:ui

# Executar testes E2E
pnpm test:e2e

# Abrir interface do Playwright
pnpm test:e2e:ui
```

### Estrutura de Testes

```
src/
├── __tests__/               # Utilitários e mocks de teste
│   ├── setup.ts             # Configuração global de testes
│   ├── test-utils.tsx       # Render customizado com providers
│   └── mocks/
│       └── fixtures/        # Dados de teste
├── lib/__tests__/           # Testes unitários para lib/
│   ├── result.test.ts       # Testes do tipo Result
│   └── utils.test.ts        # Testes de funções utilitárias
└── config/__tests__/        # Testes unitários para config/
    └── prioritization.test.ts

e2e/                         # Testes E2E com Playwright
```

### Escrevendo Testes

**Testes unitários** usam Vitest com React Testing Library:

```typescript
import { describe, expect, it } from 'vitest'
import { render, screen } from '@/__tests__/test-utils'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renderiza corretamente', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

**Testes E2E** usam Playwright contra o site de produção:

```typescript
import { test, expect } from '@playwright/test'

test('página inicial carrega', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading')).toBeVisible()
})
```

### Integração com CI

Os testes são executados automaticamente em cada PR via GitHub Actions (`.github/workflows/test.yml`).

## Solução de Problemas

### Erro 401 Unauthorized do Typesense

Se você ver erros como:

```
RequestUnauthorized: Request failed with HTTP code 401 | Server said: Forbidden - a valid `x-typesense-api-key` header must be sent.
```

**Solução:**

1. Verifique se o container do Typesense está rodando:
   ```bash
   docker ps | grep typesense
   ```

2. Obtenha a chave de API real dos logs do container:
   ```bash
   docker logs govbrnews-typesense | grep "API Key:"
   ```

3. Atualize seu arquivo `.env.local` com a chave de API correta

4. Reinicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

### Problemas de Conexão com Typesense

**Verifique se o Typesense está rodando:**
```bash
curl http://localhost:8108/health
```

Resposta esperada: `{"ok":true}`

**Verifique se a chave de API funciona:**
```bash
curl -H "X-TYPESENSE-API-KEY: sua-api-key" http://localhost:8108/collections
```

## Saiba Mais

Para aprender mais sobre Next.js, confira os seguintes recursos:

- [Documentação do Next.js](https://nextjs.org/docs) - aprenda sobre recursos e API do Next.js.
- [Aprenda Next.js](https://nextjs.org/learn) - um tutorial interativo de Next.js.

Você pode conferir o [repositório do Next.js no GitHub](https://github.com/vercel/next.js) - seu feedback e contribuições são bem-vindos!

## Deploy em Produção

Este projeto é implantado no Google Cloud Run usando GitHub Actions.

### Arquitetura de Deploy

```
┌─────────────────────┐
│  GCP Secret Manager │
│  typesense-search-  │
│    only-api-key     │
└──────────┬──────────┘
           │
    ┌──────┴───────┐
    ▼              ▼
┌─────────┐   ┌─────────┐
│ GitHub  │   │Typesense│
│ Actions │   │   VM    │
│Workflow │   │         │
└────┬────┘   └─────────┘
     │
     ▼
┌──────────────┐
│  Cloud Run   │
│    Portal    │
└──────────────┘
```

### Gerenciamento de Secrets

O deploy de produção busca a chave de API do Typesense **diretamente do GCP Secret Manager** durante o processo de build do Docker.

**Secrets Necessários no GitHub:**

- `GCP_WORKLOAD_IDENTITY_PROVIDER` - Provider do Workload Identity Federation
- `GCP_SERVICE_ACCOUNT` - Email da service account do GitHub Actions
- `NEXT_PUBLIC_TYPESENSE_HOST` - Endereço IP do servidor Typesense

**GCP Secret Manager:**

- `typesense-search-only-api-key` - Chave de API de busca (somente leitura)

**Por que essa arquitetura?**

- **Fonte única da verdade**: A chave de API é mantida apenas no GCP Secret Manager
- **Sincronização automática**: O Portal sempre usa a mesma chave que a VM do Typesense
- **Rotação fácil**: Atualize a chave no GCP → reconstrua o portal → pronto
- **Trilha de auditoria**: Todo acesso a secrets é registrado no GCP

### Fluxo de Deploy

Quando o código é enviado para `main`:

1. GitHub Actions autentica no GCP via Workload Identity Federation
2. Busca `typesense-search-only-api-key` do Secret Manager
3. Constrói a imagem Docker com a chave de API como argumento de build
4. Envia a imagem para o Artifact Registry
5. Implanta no Cloud Run

Veja [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml) para detalhes.

### Preview Deploy

Qualquer branch pode ser testada em Cloud Run usando o workflow de preview. O serviço reutiliza a infraestrutura do staging e custa **$0 quando ocioso**.

**Criar um preview:**

No GitHub Actions, execute o workflow `Preview Deploy (Cloud Run)` com:
- **action**: `deploy`
- **branch**: nome da branch (ex: `feature/minha-feature`)

A URL do preview aparece no Summary do workflow.

**Atualização automática:**

Após criar o preview, qualquer push na branch atualiza o deploy automaticamente (via `deploy-preview-update.yml`). Para que funcione, a branch precisa conter o arquivo do workflow — branches criadas a partir de `development` já o incluem.

**Listar previews ativos:**

Execute o workflow com **action**: `list`.

**Destruir um preview:**

Execute o workflow com **action**: `destroy` e o nome da branch. Isso deleta o serviço Cloud Run e limpa as imagens do Artifact Registry.

Veja [.github/workflows/deploy-preview.yml](.github/workflows/deploy-preview.yml) e [.github/workflows/deploy-preview-update.yml](.github/workflows/deploy-preview-update.yml) para detalhes.

### Infraestrutura

A infraestrutura (VM do Typesense, secrets, bindings de IAM) é gerenciada via Terraform no repositório [infra](https://github.com/destaquesgovbr/infra).
