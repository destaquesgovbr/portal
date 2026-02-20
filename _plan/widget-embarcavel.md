# Plano de Implementação: Widget Embarcável DGB

## Contexto

O DGB (Destaques Gov BR) centraliza notícias de ~160 órgãos governamentais (ministérios, agências, fundações) em uma plataforma unificada. Atualmente, cada portal governamental só exibe suas próprias notícias, perdendo oportunidades de divulgar conteúdo relacionado de outros órgãos do mesmo sistema.

**Problema a resolver:**
- Portais governamentais querem exibir notícias de órgãos relacionados ao seu sistema
- Exemplo: Ministério da Cultura quer mostrar notícias do Ibram, Iphan, Fundação Palmares, Ancine, Casa Rui Barbosa, etc.
- Atualmente não há forma simples de incorporar essas notícias filtradas

**Solução:**
Widget embarcável que permite portais gov.br incorporarem notícias do DGB com filtros configuráveis (temas, órgãos), mantendo a identidade visual do DGB e linkando de volta ao portal.

**Valor:**
- Aumenta alcance das notícias governamentais
- Facilita descoberta de conteúdo relacionado
- Melhora coordenação entre órgãos do mesmo sistema
- Aumenta visibilidade do DGB como plataforma unificadora

---

## Decisões de Arquitetura

### Abordagem: Iframe Embed com REST API

**Arquitetura:**
```
Portal Externo (ex: cultura.gov.br)
  └─ <iframe src="https://destaques.gov.br/widgets/embed?c=BASE64_CONFIG">
       └─ Página Next.js (server-rendered)
           ├─ Configuração parseada da URL
           ├─ Artigos buscados via Server Action
           └─ Componentes React hidratados
```

**Por que Iframe?**
- ✅ **Segurança**: Isolamento completo do DOM, previne XSS e injeção de scripts
- ✅ **CORS**: Não precisa de CORS para iframe (só para API REST se usada diretamente)
- ✅ **Manutenção**: Atualizações propagam automaticamente para todos widgets
- ✅ **Controle**: Portal mantém controle total sobre apresentação e CSP
- ✅ **Simplicidade**: Portal só precisa copiar tag `<iframe>`, sem implementar UI

**Por que REST API Adicional?**
- Permite integrações futuras (apps mobile, CLIs, outros frameworks)
- Flexibilidade para casos de uso avançados
- Padrão web amplamente compreendido

**Infraestrutura:**
- Hospedagem: GCP Cloud Run (escalável, multi-instância)
- Cache: Next.js ISR (5 minutos) + CDN edge caching
- Rate limiting: Postergar para quando houver necessidade real de proteção contra abuso

---

## Segurança

### CORS (Cross-Origin Resource Sharing)
```typescript
// Para /api/widgets/* e /widgets/embed
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
X-Frame-Options: ALLOWALL
Content-Security-Policy: frame-ancestors *;
```

**Justificativa para `*` wildcard:**
- Conteúdo é público (notícias governamentais)
- API é read-only (sem mutações)
- Target são portais .gov.br (confiáveis)

**Monitoramento:** Trackear domínios referrers para identificar uso e potencial abuso.

### Rate Limiting (Futuro/Opcional)

**Decisão:** NÃO implementar rate limiting no MVP a menos que seja trivial (sem mudanças estruturais).

**Justificativa:**
- Conteúdo é público e read-only
- Público-alvo são portais governamentais (uso legítimo esperado)
- Pode-se adicionar posteriormente se houver abuso
- Evita complexidade de Redis/Upstash no MVP

**Se necessário futuramente:**
- Implementação simplificada em Next.js middleware
- Sem dependências externas (Redis)
- Limites generosos (ex: 1000 req/IP/hora)

### Validação de Input

**Zod Schema para Config:**
```typescript
WidgetConfigSchema = {
  agencies: string[] (max 20, opcional)
  themes: string[] (max 10, opcional)
  layout: 'list' | 'grid-2' | 'grid-3' | 'carousel'
  size: 'small' | 'medium' | 'large' | 'custom'
  width/height: number (200-2000px, required if custom)
  showLogo/showLink/showTooltip: boolean
  articlesPerPage: number (5-50)
}
```

**Validações:**
- Agencies devem existir na lista de 156 agências
- Themes devem existir na hierarquia de temas
- Limite máximo: 50 artigos por widget
- Se nenhum filtro especificado, mostra últimas notícias de todos órgãos

### XSS Prevention
- React auto-escapa JSX (safe by default)
- Nunca usar `dangerouslySetInnerHTML` em componentes de widget
- Content-Security-Policy restringe inline scripts

---

## Componentes Principais

### 1. API REST

#### `GET /api/widgets/articles`
**Parâmetros:**
- `agencies`: comma-separated agency keys (opcional)
- `themes`: comma-separated theme codes, qualquer nível 1/2/3 (opcional)
- `limit`: 1-50 (default 10)
- `page`: pagination (default 1)

**Response:**
```json
{
  "articles": ArticleRow[],
  "pagination": { "page", "limit", "total", "hasMore" },
  "filters": { "agencies", "themes" }
}
```

**Lógica:** Reutiliza `queryArticles()` de `/src/app/(public)/busca/actions.ts`, que já implementa filtros Typesense.

**Cache:** ISR 5 minutos

#### `GET /api/widgets/config`
**Response:**
```json
{
  "agencies": [{ "key", "name", "type" }],
  "themes": [{ "code", "label", "level", "parent" }]
}
```

**Cache:** 1 hora (dados mudam raramente)

### 2. Configurador de Widget

**Rota:** `/widgets/configurador`

**UI:** Wizard single-page com 4 seções accordion:

**Seção 1: Filtros de Conteúdo**
- Órgãos: Reutiliza `AgencyMultiSelect.tsx` (opcional, multi-seleção)
- Temas: Reutiliza `ThemeMultiSelect.tsx` (opcional, multi-seleção)
- **Sem filtro de data** - sempre mostra notícias mais recentes

**Seção 2: Layout e Tamanho**
- Layout: Radio buttons (lista, grade 2 col, grade 3 col, carrossel)
- Tamanho: Presets (pequeno, médio, grande, customizado)
- Dimensões: Input width/height (se customizado)

**Seção 3: Marca e Visual**
- ☑ Exibir logo DGB (sempre true, identidade fixa)
- ☑ Link para portal DGB
- ☑ Tooltip explicando filtros
- Artigos por página: Select 5/10/15/20

**Seção 4: Código de Integração**
- Display do código iframe gerado
- Botão "Copiar Código"
- Instruções de instalação

**Preview Ao Vivo:**
- Iframe embutido simulando widget
- Atualiza em tempo real conforme configuração muda

**Estado:**
- React `useState` para config local
- URL sync via `useSearchParams` (configs compartilháveis)
- Config encoded em base64 na URL: `/widgets/configurador?c=<base64>`

### 3. Widget Embarcável

**Rota:** `/widgets/embed?c=<base64-config>`

**Componentes:**
```
<WidgetContainer config>
  <WidgetHeader /> {/* Logo DGB + título */}
  <WidgetContent layout={config.layout}>
    {articles.map(a => <NewsCard {...a} compact={config.size === 'small'} />)}
  </WidgetContent>
  {config.showTooltip && <WidgetTooltip filters={config} />}
  {config.showLink && <WidgetFooter />} {/* Link "Ver mais no DGB" */}
</WidgetContainer>
```

**Rendering:**
- Server-side: Parse config, valida, busca artigos
- Client-side: Hidrata componentes React
- Responsivo: Media queries dentro do iframe

**Cache:** ISR com revalidação de 5 minutos (300 segundos)

**Identidade Visual:**
- **Fixa**: Usa cores e estilo do DGB (sem customização)
- Mantém consistência da marca
- Simplifica implementação

### 4. Layouts de Widget

#### MVP (Prioridade Alta):
**Lista Vertical:**
- Single column, stack de NewsCards
- Ideal para sidebars, espaços estreitos
- Tamanhos: Small (300×400px, 5 artigos), Medium (400×600px, 10), Large (500×800px, 15)

**Grade 2 Colunas:**
- 2 colunas responsivas
- Ideal para seções de conteúdo principal
- Tamanhos: Small (600×400px, 6 artigos), Medium (700×600px, 10), Large (800×800px, 14)

#### Futuro (Incluir no Plano):
**Grade 3 Colunas:**
- 3 colunas, full-width
- Ideal para hero sections
- Tamanhos: Small (900×400px, 9 artigos), Medium (1000×600px, 12), Large (1200×800px, 18)

**Carrossel:**
- Horizontal scroll com navegação
- Auto-advance opcional (5s)
- Tamanhos: Small (400×300px, 1 visível), Medium (700×400px, 2), Large (1000×500px, 3)
- Implementação: `embla-carousel` (já no projeto)

**Responsividade:**
- < 480px: Força single column
- 480-768px: 1-2 colunas
- > 768px: Layout configurado
- `ResizeObserver` para adaptar ao tamanho do iframe

---

## Arquivos Críticos

### Novos Arquivos a Criar

#### API Routes
```
/src/app/api/widgets/
  articles/route.ts       # GET articles com filtros
  config/route.ts         # GET agencies/themes
```

#### Widget Pages
```
/src/app/(public)/widgets/
  configurador/
    page.tsx              # Wizard de configuração
    actions.ts            # Server actions
  embed/
    page.tsx              # Widget embarcável
    actions.ts            # Fetch articles
  layout.tsx              # Minimal layout (opcional)
```

#### Components
```
/src/components/widgets/
  WidgetContainer.tsx     # Container principal
  WidgetHeader.tsx        # Logo + título
  WidgetContent.tsx       # Lista/grade/carrossel
  WidgetFooter.tsx        # Link DGB
  WidgetTooltip.tsx       # Info sobre filtros
  WidgetError.tsx         # Estado de erro
  WidgetSkeleton.tsx      # Loading state

  configurator/
    WidgetConfigurator.tsx
    FilterSelector.tsx
    LayoutSelector.tsx
    BrandingOptions.tsx
    CodeDisplay.tsx
    WidgetPreview.tsx
```

#### Types & Utils
```
/src/types/widget.ts      # WidgetConfig, schemas Zod
/src/lib/widget-utils.ts  # Encode/decode config
/src/config/widget-presets.ts  # Tamanhos predefinidos
```

### Arquivos a Modificar

**`next.config.ts`:**
- Adicionar headers CORS para `/api/widgets/*`
- Adicionar `X-Frame-Options: ALLOWALL` para `/widgets/embed`
- CSP: `frame-ancestors *;`

### Arquivos a Reutilizar (Não Modificar)

- `/src/components/articles/NewsCard.tsx` - Display de artigos
- `/src/components/filters/AgencyMultiSelect.tsx` - Seleção de órgãos
- `/src/components/filters/ThemeMultiSelect.tsx` - Seleção de temas
- `/src/app/(public)/busca/actions.ts:queryArticles` - Lógica de query
- `/src/data/agencies-utils.ts` - Carregar agências
- `/src/data/themes-utils.ts` - Carregar temas
- `/src/config/agencies.yaml` - 156 agências
- `/src/config/themes.yaml` - Hierarquia de temas

---

## Estratégia de Testes Automáticos

### Ferramentas

O projeto já possui infraestrutura de testes configurada:
- **Vitest**: Testes unitários e de integração (configurado em `vitest.config.ts`)
- **Playwright**: Testes E2E (configurado em `playwright.config.ts`)
- **React Testing Library**: Testes de componentes React

### Pirâmide de Testes

```
        /\
       /E2E\         Poucos - Lentos - Cobertura ampla
      /------\
     /  API  \       Médio - Médios - Endpoints e lógica
    /----------\
   / Unitários \     Muitos - Rápidos - Unidades isoladas
  /--------------\
```

**Distribuição alvo:**
- 70% testes unitários
- 20% testes de integração/API
- 10% testes E2E

### 1. Testes Unitários (Vitest)

**Localização:** Arquivos `*.test.ts` ou `*.spec.ts` ao lado do código

**Cobertura:**

#### Utils e Helpers
```typescript
// src/lib/widget-utils.test.ts
describe('Widget Config Encoding', () => {
  it('encodes config to base64 URL-safe string', () => {
    const config = { agencies: ['minc'], layout: 'list' }
    const encoded = encodeWidgetConfig(config)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('decodes base64 back to valid config', () => {
    const config = { themes: ['08'], size: 'medium' }
    const encoded = encodeWidgetConfig(config)
    const decoded = decodeWidgetConfig(encoded)
    expect(decoded).toEqual(config)
  })

  it('throws error on invalid base64', () => {
    expect(() => decodeWidgetConfig('invalid!!!')).toThrow()
  })
})
```

#### Zod Schemas
```typescript
// src/types/widget.test.ts
describe('WidgetConfigSchema', () => {
  it('validates correct config', () => {
    const config = {
      agencies: ['minc'],
      themes: ['08'],
      layout: 'list',
      size: 'medium',
      articlesPerPage: 10
    }
    const result = WidgetConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
  })

  it('rejects config with invalid layout', () => {
    const config = { layout: 'invalid-layout' }
    const result = WidgetConfigSchema.safeParse(config)
    expect(result.success).toBe(false)
  })

  it('enforces max 20 agencies', () => {
    const config = { agencies: Array(21).fill('minc') }
    const result = WidgetConfigSchema.safeParse(config)
    expect(result.success).toBe(false)
  })

  it('requires width/height for custom size', () => {
    const config = { size: 'custom' }
    const result = WidgetConfigSchema.safeParse(config)
    expect(result.success).toBe(false)
  })
})
```

#### Componentes (React Testing Library)
```typescript
// src/components/widgets/WidgetTooltip.test.tsx
import { render, screen } from '@testing-library/react'
import { WidgetTooltip } from './WidgetTooltip'

describe('WidgetTooltip', () => {
  it('displays agency filters', () => {
    const filters = { agencies: ['minc', 'ibram'] }
    render(<WidgetTooltip filters={filters} />)
    expect(screen.getByText(/Ministério da Cultura/i)).toBeInTheDocument()
    expect(screen.getByText(/Ibram/i)).toBeInTheDocument()
  })

  it('displays theme filters', () => {
    const filters = { themes: ['08'] }
    render(<WidgetTooltip filters={filters} />)
    expect(screen.getByText(/Cultura/i)).toBeInTheDocument()
  })

  it('shows "Todas as notícias" when no filters', () => {
    render(<WidgetTooltip filters={{}} />)
    expect(screen.getByText(/Todas as notícias/i)).toBeInTheDocument()
  })
})
```

### 2. Testes de Integração/API (Vitest)

**Foco:** Testar API routes e Server Actions

```typescript
// src/app/api/widgets/articles/route.test.ts
import { GET } from './route'

describe('GET /api/widgets/articles', () => {
  it('returns articles without filters', async () => {
    const request = new Request('http://localhost/api/widgets/articles')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.articles).toBeInstanceOf(Array)
    expect(data.pagination).toBeDefined()
  })

  it('filters by agencies', async () => {
    const request = new Request('http://localhost/api/widgets/articles?agencies=minc,ibram')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.filters.agencies).toEqual(['minc', 'ibram'])
    // Verificar que todos artigos são dos órgãos filtrados
    data.articles.forEach(article => {
      expect(['minc', 'ibram']).toContain(article.agency)
    })
  })

  it('validates limit parameter', async () => {
    const request = new Request('http://localhost/api/widgets/articles?limit=100')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('returns CORS headers', async () => {
    const request = new Request('http://localhost/api/widgets/articles', {
      headers: { Origin: 'https://cultura.gov.br' }
    })
    const response = await GET(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
```

### 3. Testes E2E (Playwright)

**Localização:** `e2e/widgets/`

**Cobertura:**

#### Configurador
```typescript
// e2e/widgets/configurador.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Widget Configurator', () => {
  test('creates widget with agency filters', async ({ page }) => {
    await page.goto('/widgets/configurador')

    // Selecionar agência
    await page.click('button:has-text("Órgãos")')
    await page.click('label:has-text("Ministério da Cultura")')

    // Verificar preview atualiza
    const preview = page.frameLocator('[data-testid="widget-preview"]')
    await expect(preview.locator('h3')).toBeVisible()

    // Gerar código
    await page.click('button:has-text("Copiar Código")')
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toContain('<iframe')
    expect(clipboard).toContain('src="')
  })

  test('preview updates when layout changes', async ({ page }) => {
    await page.goto('/widgets/configurador')

    // Selecionar layout grade 2 colunas
    await page.click('input[value="grid-2"]')

    // Verificar preview usa grid
    const preview = page.frameLocator('[data-testid="widget-preview"]')
    const grid = preview.locator('[data-layout="grid-2"]')
    await expect(grid).toBeVisible()
  })

  test('validates custom size requires dimensions', async ({ page }) => {
    await page.goto('/widgets/configurador')

    await page.click('input[value="custom"]')

    // Sem width/height deve mostrar erro
    await expect(page.locator('text=/largura.*obrigatória/i')).toBeVisible()
  })
})
```

#### Widget Embed
```typescript
// e2e/widgets/embed.spec.ts
test.describe('Widget Embed', () => {
  test('renders with valid config', async ({ page }) => {
    const config = btoa(JSON.stringify({
      agencies: ['minc'],
      layout: 'list',
      size: 'medium'
    }))

    await page.goto(`/widgets/embed?c=${config}`)

    // Verificar artigos carregam
    await expect(page.locator('[data-testid="news-card"]').first()).toBeVisible()

    // Verificar logo DGB
    await expect(page.locator('img[alt*="DGB"]')).toBeVisible()
  })

  test('handles invalid config gracefully', async ({ page }) => {
    await page.goto('/widgets/embed?c=invalid!!!')
    await expect(page.locator('text=/configuração inválida/i')).toBeVisible()
  })

  test('is embeddable in external iframe', async ({ page }) => {
    // Criar página de teste com iframe
    await page.setContent(`
      <html>
        <body>
          <iframe
            src="http://localhost:3000/widgets/embed"
            width="800"
            height="600"
          ></iframe>
        </body>
      </html>
    `)

    const iframe = page.frameLocator('iframe')
    await expect(iframe.locator('h3').first()).toBeVisible()
  })

  test('articles are clickable and open in new tab', async ({ page, context }) => {
    await page.goto('/widgets/embed')

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('[data-testid="news-card"]').first().click()
    ])

    await newPage.waitForLoadState()
    expect(newPage.url()).toContain('/artigos/')
  })
})
```

#### Cross-Browser
```typescript
// e2e/widgets/cross-browser.spec.ts
import { test, devices } from '@playwright/test'

const browsers = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
]

browsers.forEach(({ name, ...device }) => {
  test.describe(`Widget on ${name}`, () => {
    test.use(device)

    test('displays correctly', async ({ page }) => {
      await page.goto('/widgets/embed')
      await expect(page.locator('[data-testid="widget-container"]')).toBeVisible()

      // Screenshot for visual regression
      await expect(page).toHaveScreenshot(`widget-${name}.png`)
    })
  })
})
```

### 4. Testes de Performance

```typescript
// e2e/widgets/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Widget Performance', () => {
  test('loads within 2 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/widgets/embed')
    await page.locator('[data-testid="news-card"]').first().waitFor()
    const duration = Date.now() - start

    expect(duration).toBeLessThan(2000)
  })

  test('bundle size is acceptable', async ({ page }) => {
    const response = await page.goto('/widgets/embed')
    const size = parseInt(response.headers()['content-length'] || '0')

    // < 200KB
    expect(size).toBeLessThan(200 * 1024)
  })

  test('images lazy load', async ({ page }) => {
    await page.goto('/widgets/embed')

    const images = page.locator('img[loading="lazy"]')
    const count = await images.count()

    expect(count).toBeGreaterThan(0)
  })
})
```

### 5. Testes de Segurança

```typescript
// e2e/widgets/security.spec.ts
test.describe('Widget Security', () => {
  test('prevents XSS in config', async ({ page }) => {
    const maliciousConfig = btoa(JSON.stringify({
      agencies: ['<script>alert("xss")</script>']
    }))

    await page.goto(`/widgets/embed?c=${maliciousConfig}`)

    // Script não deve executar
    page.on('dialog', () => {
      throw new Error('XSS executed!')
    })

    await page.waitForTimeout(1000)
    // Se chegou aqui, XSS foi bloqueado
  })

  test('has CSP headers', async ({ page }) => {
    const response = await page.goto('/widgets/embed')
    const csp = response.headers()['content-security-policy']

    expect(csp).toBeDefined()
    expect(csp).toContain('frame-ancestors')
  })

  test('has CORS headers on API', async ({ page }) => {
    const response = await page.goto('/api/widgets/articles')

    expect(response.headers()['access-control-allow-origin']).toBe('*')
  })
})
```

### 6. Cobertura de Código

**Meta:** ≥ 80% de cobertura

**Configuração Vitest:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'e2e/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
```

**Comando:**
```bash
pnpm vitest --coverage
```

### 7. CI/CD Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**Scripts package.json:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:watch": "vitest watch"
  }
}
```

### 8. Estrutura de Arquivos de Teste

```
/portal
├── src/
│   ├── lib/
│   │   ├── widget-utils.ts
│   │   └── widget-utils.test.ts       # Testes unitários ao lado do código
│   ├── types/
│   │   ├── widget.ts
│   │   └── widget.test.ts
│   ├── components/widgets/
│   │   ├── WidgetTooltip.tsx
│   │   └── WidgetTooltip.test.tsx
│   └── app/api/widgets/
│       └── articles/
│           ├── route.ts
│           └── route.test.ts          # Testes de integração da API
├── e2e/
│   └── widgets/
│       ├── configurador.spec.ts       # E2E do configurador
│       ├── embed.spec.ts              # E2E do widget
│       ├── cross-browser.spec.ts      # Testes cross-browser
│       ├── performance.spec.ts        # Testes de performance
│       └── security.spec.ts           # Testes de segurança
├── vitest.config.ts
├── vitest.integration.config.ts       # Config separada para integração
└── playwright.config.ts
```

### 9. Checklist de Testes por Fase

#### Fase 1 (API Layer)
- [ ] Testes unitários de schemas Zod
- [ ] Testes de API routes
- [ ] Testes de validação de parâmetros
- [ ] Testes de CORS headers

#### Fase 2 (Widget Display)
- [ ] Testes de componentes (WidgetContainer, WidgetHeader, etc)
- [ ] Testes de encode/decode config
- [ ] Testes E2E de embedding básico
- [ ] Testes de responsividade

#### Fase 3 (Configurador)
- [ ] Testes E2E do fluxo completo
- [ ] Testes de atualização do preview
- [ ] Testes de geração de código
- [ ] Testes de validação de formulário

#### Fases 4-5 (Layouts + Polimento)
- [ ] Testes de todos layouts
- [ ] Testes cross-browser
- [ ] Testes de performance
- [ ] Testes de segurança
- [ ] Testes de acessibilidade (Playwright axe)

### 10. Comandos de Teste

**Durante desenvolvimento:**
```bash
# Watch mode (re-executa ao salvar)
pnpm test:watch

# Testes específicos
pnpm vitest widget-utils

# E2E em modo UI (debug visual)
pnpm test:e2e:ui
```

**Antes de commit:**
```bash
# Todos os testes
pnpm test:unit && pnpm test:e2e

# Com cobertura
pnpm test:unit --coverage
```

**CI/CD:**
```bash
# Execução completa sem watch
pnpm test:unit && pnpm test:integration && pnpm test:e2e
```

---

## Fases de Implementação

### Fase 1: API Layer (Semana 1)
**Objetivo:** API REST funcional com segurança

**Tarefas:**
1. Criar `/api/widgets/articles/route.ts`
   - Parse query params (agencies, themes, limit, page)
   - Reutilizar `queryArticles()` do busca (remover parâmetros de data)
   - Validar com Zod schema
   - Retornar JSON paginado
   - Cache ISR 5 minutos
2. Criar `/api/widgets/config/route.ts`
   - Retornar listas de agencies e themes
   - Cache 1 hora
3. Adicionar CORS headers
   - Configurar em `next.config.ts`
   - Testar com curl de origem externa
4. Testes unitários
   - Testar validação de params
   - Testar filtros agencies/themes

**Entregável:** API REST funcional com CORS

### Fase 2: Widget Display - MVP Layouts (Semana 2)
**Objetivo:** Widget embarcável com lista e grade 2 colunas

**Tarefas:**
1. Criar types e schemas
   - `types/widget.ts` com `WidgetConfig` e Zod schemas (sem data)
   - `lib/widget-utils.ts` com encode/decode config
2. Criar `/widgets/embed/page.tsx`
   - Parse `?c=base64` param
   - Validar config
   - Server action para buscar artigos
   - Renderizar componentes
   - ISR revalidate 300s (5 minutos)
3. Criar componentes básicos
   - `WidgetContainer` com estilos globais
   - `WidgetHeader` (logo DGB)
   - `WidgetFooter` (link para DGB)
   - `WidgetTooltip` (info filtros - apenas agencies/themes)
   - `WidgetError` (estado erro)
4. Implementar layout Lista
   - Single column vertical
   - Reutilizar `NewsCard` com prop `compact`
   - 3 tamanhos (small/medium/large)
5. Implementar layout Grade 2 Colunas
   - CSS Grid 2 colunas
   - Responsivo (1 col em mobile)
   - 3 tamanhos
6. Testar embedding
   - Criar arquivo HTML de teste
   - Verificar CORS
   - Testar responsividade
7. Headers CSP
   - Adicionar em `next.config.ts`
   - `X-Frame-Options: ALLOWALL`
   - `Content-Security-Policy: frame-ancestors *;`

**Entregável:** Widget embarcável funcionando em iframe com 2 layouts

### Fase 3: Configurador UI (Semana 3)
**Objetivo:** Interface de configuração com preview

**Tarefas:**
1. Criar `/widgets/configurador/page.tsx`
   - Layout accordion 4 seções
   - State management com `useState`
   - URL sync com `useSearchParams`
2. Seção 1: Filtros
   - Reutilizar `AgencyMultiSelect`
   - Reutilizar `ThemeMultiSelect`
   - **Sem DatePicker** (removido)
3. Seção 2: Layout
   - Radio buttons para layouts (lista, grade-2 por enquanto)
   - Radio buttons para tamanhos (small/medium/large/custom)
   - Inputs width/height (se custom)
4. Seção 3: Branding
   - Checkboxes: showLogo, showLink, showTooltip
   - Select: articlesPerPage (5/10/15/20)
5. Seção 4: Código
   - Gerar código iframe com config base64
   - Syntax highlighting
   - Botão copy-to-clipboard
   - Instruções de instalação
6. Preview ao vivo
   - Iframe embutido na página
   - Atualiza quando config muda
   - Loading states
7. E2E tests
   - Testar fluxo completo de configuração
   - Testar preview atualiza
   - Testar código gerado

**Entregável:** Configurador funcional com preview

### Fase 4: Layouts Adicionais (Semana 4)
**Objetivo:** Grade 3 colunas e Carrossel

**Tarefas:**
1. Implementar layout Grade 3 Colunas
   - CSS Grid 3 colunas
   - Responsivo (3→2→1 col)
   - 3 tamanhos
   - Adicionar opção no configurador
2. Implementar layout Carrossel
   - Integrar `embla-carousel` (já existe no projeto)
   - Navegação prev/next
   - Auto-advance opcional (5s)
   - Responsivo (3→2→1 artigos visíveis)
   - 3 tamanhos
   - Adicionar opção no configurador
3. Refinar responsividade
   - Testar todos layouts em diferentes tamanhos
   - `ResizeObserver` se necessário
   - Mobile-first approach
4. Acessibilidade
   - ARIA labels em todos componentes
   - Navegação por teclado
   - Screen reader testing
5. Performance
   - Lazy load images
   - Bundle size check (< 200KB)
   - Lighthouse score > 90

**Entregável:** Todos 4 layouts funcionais e otimizados

### Fase 5: Polimento e Documentação (Semana 5)
**Objetivo:** Produção-ready

**Tarefas:**
1. Estados de erro
   - Config inválido
   - Sem artigos encontrados
   - Erro API/Typesense
2. Loading states
   - Skeleton screens
   - Spinners
   - Fallbacks
3. Documentação
   - README do widget
   - Guia de integração para portais
   - Exemplos de configuração
   - Troubleshooting
4. Monitoramento
   - Adicionar tracking Umami (já existe)
   - Eventos: `widget_embed_view`, `widget_article_click`
   - Trackear referrer domains
5. Testes cross-browser
   - Chrome, Firefox, Safari, Edge
   - iOS Safari, Android Chrome
   - Diferentes tamanhos de iframe
6. Security audit
   - Revisar validações
   - Testar XSS attempts
   - CORS final check
7. Deploy preview
   - Testar em staging
   - Soft launch com 2-3 portais piloto
   - Coletar feedback

**Entregável:** Sistema completo, documentado, testado, pronto para produção

---

## Preparação para Autenticação Futura

Embora autenticação não seja implementada no MVP, o design permite fácil transição:

### Database Schema (Futuro)
```sql
CREATE TABLE widget_configs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  config JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Transição
**Fase 1 (MVP):** Config em URL base64
- `/widgets/embed?c=<base64-config>`
- Sem autenticação
- Qualquer um pode criar

**Fase 2 (Com Auth):** Configs salvos no DB
- `/widgets/embed?id=<uuid>` (lookup no DB)
- `/widgets/embed?c=<base64>` (ainda funciona, retrocompatível)
- Dashboard de widgets salvos
- Analytics por widget/usuário

**Analytics (Futuro):**
- Não implementar tracking no MVP
- Quando houver auth, adicionar:
  - Impressões por widget
  - Cliques por widget
  - Domains usando cada widget
  - Dashboard de analytics

---

## Verificação End-to-End

### Checklist de Teste

**1. API Endpoints**
- [ ] `GET /api/widgets/articles` sem params retorna últimas notícias
- [ ] Filtrar por `?agencies=minc,ibram` funciona
- [ ] Filtrar por `?themes=08` (cultura) funciona
- [ ] `?limit=5` retorna 5 artigos
- [ ] `?limit=100` retorna erro 400
- [ ] CORS headers presentes em response
- [ ] Cache de 5 minutos funcionando

**2. Widget Embed**
- [ ] `/widgets/embed?c=<base64>` renderiza artigos
- [ ] Config inválido mostra erro
- [ ] Logo DGB visível se `showLogo: true`
- [ ] Footer link presente se `showLink: true`
- [ ] Tooltip aparece se `showTooltip: true`
- [ ] Filtros aplicados corretamente (verificar agências/temas)
- [ ] Layout responsivo (testar 300px, 700px, 1200px)
- [ ] Sempre mostra notícias recentes (sem filtro de data)

**3. Configurador**
- [ ] `/widgets/configurador` carrega
- [ ] Selecionar 3 agências funciona
- [ ] Selecionar 2 temas funciona
- [ ] **Sem opção de data** (removida)
- [ ] Selecionar layout atualiza preview
- [ ] Mudar tamanho atualiza preview
- [ ] Preview mostra artigos filtrados
- [ ] Código iframe gerado corretamente
- [ ] Botão copiar funciona

**4. Embedding Externo**
- [ ] Criar HTML: `<iframe src="..."></iframe>`
- [ ] Abrir em navegador (file://)
- [ ] Widget carrega sem erros CORS
- [ ] Artigos visíveis
- [ ] Click em artigo abre em nova aba
- [ ] Click em footer abre DGB portal

**5. Cross-Browser**
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Edge
- [ ] iOS Safari
- [ ] Android Chrome

**6. Performance**
- [ ] Lighthouse score > 90
- [ ] TTFB < 500ms
- [ ] Bundle size < 200KB
- [ ] Imagens lazy load

**7. Segurança**
- [ ] Tentar XSS: `?c=<base64-with-script>` → bloqueado
- [ ] Headers CSP presentes
- [ ] X-Frame-Options permite embedding

---

## Resumo Executivo

**Entregável:** Sistema de widget embarcável para notícias DGB

**Arquitetura:**
- Iframe embedding (segurança + isolamento)
- REST API pública (flexibilidade futura)
- Cache ISR 5 minutos
- Identidade visual fixa do DGB
- **Sem rate limiting no MVP** (adicionar se necessário)

**MVP (Semanas 1-3):**
- API REST com filtros (agencies, themes)
- 2 layouts (lista, grade 2 col)
- Configurador web com preview
- Código iframe gerado automaticamente
- **Sem filtro de data** (sempre mostra recentes)

**Completo (Semanas 4-5):**
- 4 layouts (+ grade 3 col, carrossel)
- Documentação completa
- Testes cross-browser
- Pronto para produção

**Segurança:**
- CORS configurado
- Validação completa de inputs
- XSS prevention
- Rate limiting posteriorizado (adicionar se houver abuso)

**Extensibilidade:**
- Preparado para autenticação futura
- Database schema planejado
- Analytics path definido
- Compatibilidade retroativa garantida
