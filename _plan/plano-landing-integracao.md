# Plano: Incluir 3 novos serviços na landing (Chat, MCP, GraphQL)

## Context

A landing atual (`src/app/(public)/page.tsx`) foi construída em torno da narrativa **Web Difusora** — dois fluxos: Difusão (outbound, para ASCOMs) e Inteligência (inbound, para gestores). As 6 features hoje (Clipping, Widget, WebPush, Feeds, Busca, Panorama) se encaixam bem nessas duas caixas.

Surgem agora 3 novos serviços que representam uma **terceira camada conceitual** — interfaces **programáticas e conversacionais** com a plataforma:

1. **Chat conversacional** — agente de IA especializado em comunicação/análise, com RAG sobre o acervo de notícias. Usa o MCP server por baixo.
2. **MCP server** — interface Model Context Protocol para aplicações agênticas (LLMs, agents) interagirem com o DGB. Já existe implementado em `LAB/govbrnews-mcp/` com tools/prompts/resources.
3. **GraphQL API** — API tipada unificada para consultar e configurar tudo no DGB. Em desenvolvimento no projeto `graphql-api/` (TDD, 110+ testes passando na foundation branch, ainda sem deploy público).

O desafio é **incluir esses 3 sem quebrar a narrativa de dois fluxos**. A solução é criar uma **terceira caixa** complementar — que não compete com Difusão e Inteligência, mas as habilita e estende para um público técnico/agêntico.

---

## Decisão arquitetural de narrativa

### Adicionar uma terceira camada: **Integração**

A nova arquitetura narrativa fica assim:

```
                ┌───────────────────────────────────┐
                │      DestaquesGovBr               │
                │       Web Difusora                │
                └───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  DIFUSÃO    │     │INTELIGÊNCIA │     │ INTEGRAÇÃO  │
    │ (outbound)  │     │  (inbound)  │     │ (programmatic)│
    │             │     │             │     │             │
    │ Órgão →     │     │ Gov →       │     │ Apps →      │
    │ Cidadão     │     │ Órgão       │     │ DGB         │
    │             │     │             │     │             │
    │ • Widgets   │     │ • Clipping  │     │ • GraphQL   │
    │ • WebPush   │     │ • Panorama  │     │ • MCP       │
    │ • RSS       │     │ • Dashboard │     │ • Chat      │
    │ • Busca     │     │             │     │   (IA)      │
    └─────────────┘     └─────────────┘     └─────────────┘
         ↑                    ↑                    ↑
     ASCOMs             Gestores            Devs / Agents
```

**Por que "Integração" e não "Plataforma" ou "Desenvolvedores"?**

- "Plataforma" é vago e já usado no positioning statement (é a macro).
- "Desenvolvedores" limita demais — MCP e Chat também atendem **end users de LLMs** (pesquisadores usando Claude Desktop, por exemplo).
- **"Integração"** captura bem o ponto comum: são pontos de contato que permitem que *outros sistemas* (agentes, apps, dashboards customizados) **integrem** com o DGB — e isso inclui tanto humanos via chat quanto máquinas via API.

**Público implícito:**
- Dev técnico de um órgão que quer montar um dashboard interno
- Pesquisador usando Claude Desktop com MCP
- Jornalista com um agente pessoal monitorando temas
- Outros órgãos construindo integrações institucionais

---

## Estrutura proposta: mudanças na landing

### Mudança 1 — Atualizar Seção 3 (Dois fluxos) para **Três fluxos**

**Arquivo:** `src/app/(public)/page.tsx`

**Localização:** Seção com badge "Como resolvemos" + título "Dois fluxos, uma plataforma" (linhas ~140-230).

**Mudança:**
- Título: `Dois fluxos, uma plataforma` → **`Três fluxos, uma plataforma`**
- Parágrafo de intro: adicionar um terceiro fluxo ao texto.
- Grid: `lg:grid-cols-2` → `lg:grid-cols-3`
- Adicionar um novo card "Integração" no lado direito com a cor roxa/violeta (pra fechar o arco de cores: azul / verde / violeta).

**Copy novo — intro atualizada:**

> "O DestaquesGovBr organiza tudo que seu órgão precisa em três direções complementares: **Difusão**, para levar sua comunicação ao cidadão, **Inteligência**, para trazer o que importa até quem decide, e **Integração**, para conectar o DGB a qualquer outro sistema ou agente que precise operar sobre a base do governo federal."

**Copy novo — card "Integração":**

- **Eyebrow:** `Para devs e agentes`
- **H3:** `Conecte qualquer sistema à base do DGB`
- **Parágrafo:** `Desenvolvedores de órgãos, pesquisadores, jornalistas e aplicações agênticas têm acesso programático completo ao DGB. Consulte notícias, operem sobre recortes temáticos, busquem semanticamente no acervo, acompanhem tendências — tudo via API GraphQL tipada, servidor MCP nativo para LLMs, ou chat conversacional com agente especializado.`
- **3 bullets de benefícios:**
  - **API GraphQL tipada:** uma interface única para consulta e configuração, com codegen TypeScript
  - **MCP nativo:** aplicações com Claude, ChatGPT ou agentes customizados se conectam sem glue code
  - **Chat especializado:** converse com um agente que já conhece o acervo e sabe analisar
- **CTA:** `Ver as ferramentas de integração` → âncora `#features`

---

### Mudança 2 — Adicionar 3 FeatureCards à Seção 4 (Features)

**Arquivo:** `src/app/(public)/page.tsx`

**Localização:** Grid de 6 features (linhas ~240-305). Expandir para **9 features** em grid `3x3` (continua `lg:grid-cols-3`).

**Ordem sugerida:** manter os 6 atuais primeiro, adicionar os 3 novos no final do grid (eles são os "avançados"). Ou alternar — prefiro manter os 6 básicos juntos por familiaridade do leitor.

**Novos componentes:**

Antes de adicionar os novos cards, preciso **estender o tipo `Flow`** do `FlowBadge` para incluir `'integracao'` (roxo/violeta):

**Arquivo:** `src/components/landing/FlowBadge.tsx`

Adicionar:
```tsx
type Flow = 'difusao' | 'inteligencia' | 'integracao' | 'ambos'
// ...
integracao: {
  label: 'Integração',
  className: 'bg-violet-50 text-violet-700 border-violet-200',
  Icon: Code2, // ou Network, Zap
},
```

**Novos FeatureCards no page.tsx:**

**a) Chat Conversacional (IA)**

```tsx
<FeatureCard
  icon={<MessageCircle className="h-5 w-5" />}
  title="Chat com agente de análise"
  description="Converse com um agente de IA especializado em comunicação governamental. Peça análises temporais, comparações entre órgãos, cruzamentos temáticos — tudo em linguagem natural, com respostas fundamentadas no acervo."
  flow="integracao"
  badge="em breve"
/>
```

**b) MCP Server**

```tsx
<FeatureCard
  icon={<Plug className="h-5 w-5" />}
  title="Servidor MCP"
  description="Conecte Claude Desktop, ChatGPT ou qualquer aplicação agêntica ao DGB via Model Context Protocol. Acesso direto a busca, facets, análise temporal e artigos similares — com prompts guiados prontos para uso."
  flow="integracao"
  href="https://github.com/destaquesgovbr/govbrnews-mcp"
  linkLabel="Ver repositório MCP"
/>
```

*(Nota: se o repo `govbrnews-mcp` for público antes do lançamento. Caso contrário, sem `href` e com badge "em breve".)*

**c) API GraphQL**

```tsx
<FeatureCard
  icon={<Code2 className="h-5 w-5" />}
  title="API GraphQL"
  description="Uma API tipada e unificada para consultar o acervo, configurar clippings, gerenciar marketplace e integrar sistemas externos. Substitui dezenas de rotas REST por um schema único, com codegen TypeScript e playground interativo."
  flow="integracao"
  badge="em breve"
/>
```

*(Badge "em breve" porque ainda não há endpoint público — Fases 19-20 do plano do graphql-api cobrem o deploy.)*

**Resultado visual:** grid `3x3` com 9 cards, cada um taggeado por cor de fluxo — o leitor identifica visualmente o padrão "azul = difusão, verde = inteligência, violeta = integração".

---

### Mudança 3 — Atualizar seção "Em desenvolvimento" (roadmap)

**Localização:** Seção 6 (linhas ~325-380), 3 cards atuais de roadmap.

**Situação:** hoje o roadmap lista:
1. Gerar notícia com IA
2. Dashboard do Órgão
3. Web Difusora como padrão nacional

**Problema:** agora os novos serviços (Chat, MCP, GraphQL) também são "em breve". Para não duplicar, **consolidar e reorganizar**:

**Nova proposta — 4 cards em grid `2x2` (ou `4x1` em desktop amplo):**

1. **Gerar notícia com IA** *(mantido)*
2. **API GraphQL pública** *(novo — versão roadmap do feature card)*
3. **Dashboard do Órgão** *(mantido, mas com nota sobre Panorama como preview)*
4. **Ecossistema agêntico** *(novo — cobre Chat + MCP juntos como visão)*

**Copy dos 2 novos:**

**Card — API GraphQL pública:**
> **API GraphQL pública**
> Um único endpoint tipado para consultar tudo do DGB — notícias, temas, métricas, clippings — com schema documentado, playground interativo e codegen para TypeScript. Em desenvolvimento em ciclos de TDD.

**Card — Ecossistema agêntico:**
> **Ecossistema agêntico**
> Servidor MCP para integração nativa com Claude, ChatGPT e agentes customizados, mais um chat conversacional com agente especializado em análise do acervo governamental. Primeira plataforma de dados do governo federal pronta para a era dos agentes de IA.

**Opção alternativa:** manter os 3 cards originais e adicionar uma **quarta linha horizontal** menor chamada "Camada de integração" que engloba os 3 serviços novos numa única mensagem.

**Minha recomendação:** ir com o grid `2x2`. Fica mais balanceado e a palavra "em breve" nos feature cards já sinaliza que os 3 novos estão no forno — o roadmap serve pra dar **contexto macro**, não repetir.

---

### Mudança 4 — Criar página dedicada de docs/integração

**Decisão:** criar uma nova rota `/integracao` que funciona como **landing técnica** para os 3 serviços. Linkada:
- Dos 3 FeatureCards novos (linkLabel: "Ver documentação")
- Do card "Ecossistema agêntico" do roadmap
- Como ponto de pouso quando a GraphQL tiver playground ativo

**Arquivo:** `src/app/(public)/integracao/page.tsx`

**Estrutura proposta:**

```
┌────────────────────────────────────────────────┐
│ Hero técnico                                   │
│ "Integrações programáticas"                    │
│ CTAs: GraphQL playground (disabled) · MCP repo │
├────────────────────────────────────────────────┤
│ Seção: GraphQL API                             │
│ - O que resolve (25 rotas REST → 1 schema)     │
│ - Auth model (JWT + Service account)           │
│ - Query/Mutation surface (tabela)              │
│ - Status: "em desenvolvimento, TDD"            │
│ - Link: repositório graphql-api                │
├────────────────────────────────────────────────┤
│ Seção: MCP Server                              │
│ - O que é Model Context Protocol (1 parágrafo) │
│ - Tools disponíveis (search, facets, similar)  │
│ - Prompts guiados                              │
│ - Como instalar no Claude Desktop (snippet)    │
│ - Link: govbrnews-mcp repo                     │
├────────────────────────────────────────────────┤
│ Seção: Chat Conversacional                     │
│ - Roadmap de como será                         │
│ - Casos de uso sugeridos                       │
│ - Status: "em desenvolvimento"                 │
├────────────────────────────────────────────────┤
│ CTA final: contato técnico                     │
└────────────────────────────────────────────────┘
```

**Nota:** podemos começar com uma versão *stub* que tem o hero + 3 seções curtas, cada uma com status e link. A medida que os serviços forem para produção, enriquecemos. A existência da página em si já valida publicamente a narrativa.

---

### Mudança 5 — Adicionar link "Integração" no menu (opcional, defensivo)

**Arquivo:** `src/components/layout/Header.tsx`

**Situação atual:**
```tsx
const routeLinks = [
  { href: '/noticias', label: 'Notícias' },
  { href: '/orgaos', label: 'Órgãos' },
  { href: '/temas', label: 'Temas' },
]
const themeLinks = [{ href: '/clippings?sort=trending', label: 'Clippings' }]
```

**Proposta:** adicionar "Integração" no `themeLinks` (ao lado de Clippings). O `themeLinks` já é um espaço para entradas não-navegacionais principais, o que casa bem — Integração não compete com Notícias/Órgãos/Temas (que são navegação de conteúdo).

```tsx
const themeLinks = [
  { href: '/clippings?sort=trending', label: 'Clippings' },
  { href: '/integracao', label: 'Integração' },
]
```

**Alternativa conservadora:** não adicionar ao header. Manter `/integracao` acessível apenas via landing e footer. Vai depender de quanto a gente quer "empurrar" esse público técnico pra cima.

**Minha recomendação:** começar sem link no header. Os feature cards já dão destaque suficiente, e não queremos inflar o menu enquanto os serviços ainda estão em desenvolvimento. Adicionamos o link quando GraphQL entrar em staging.

---

## Arquitetura técnica resumida

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/landing/FlowBadge.tsx` | Adicionar `'integracao'` ao tipo `Flow` com config violeta |
| `src/app/(public)/page.tsx` | Atualizar Seção 3 (3 fluxos), adicionar 3 FeatureCards na Seção 4, reorganizar Seção 6 (roadmap) |
| `src/app/(public)/integracao/page.tsx` | **Novo** — landing técnica com 3 seções |

### Componentes reutilizados

Todos os componentes do kit de landing (`src/components/landing/*`) já servem:
- `LandingHero`, `LandingSection`, `FeatureCard`, `FlowBadge`, `PainPointGrid`, `StatsBar`
- Nenhum componente novo precisa ser criado para as mudanças na landing principal
- A página `/integracao` usa os mesmos componentes com copy diferente

### Ícones (lucide-react)

Novos ícones a importar em `page.tsx`:
- `MessageCircle` (chat) — já usado em outros lugares
- `Plug` ou `Network` (MCP)
- `Code2` ou `Braces` (GraphQL)

---

## Sequência de implementação

1. **Estender `FlowBadge`** com o fluxo `integracao` (violeta)
2. **Atualizar Seção 3** da home: título, intro, grid 3 colunas, card Integração
3. **Adicionar 3 FeatureCards** na Seção 4 (Chat, MCP, GraphQL) com `flow="integracao"` e badge `em breve`
4. **Reorganizar Seção 6** (roadmap): consolidar em 4 cards com os 2 novos (GraphQL pública, Ecossistema agêntico)
5. **Criar `/integracao/page.tsx`** com 3 seções stub
6. **Atualizar `plano-landing-para-orgaos.md`** em `portal/_plan/` para documentar a nova narrativa de 3 fluxos (manter histórico)
7. **Testes E2E:** estender `e2e/home.spec.ts` para validar o título "Três fluxos" e a presença dos 3 novos features; criar `e2e/integracao.spec.ts` com smoke test básico

---

## Verificação

```bash
cd portal

# Type check
npx tsc --noEmit 2>&1 | grep -v "pubsub\|@google-cloud\|lista-espera\|telegram/__tests__\|punycode"

# Dev server
lsof -ti:3000 | xargs kill -9 2>/dev/null; pnpm dev

# Smoke HTTP
curl -s -o /dev/null -w "%{http_code} /\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} /integracao\n" http://localhost:3000/integracao

# Content check
curl -s http://localhost:3000/ | grep -o "Três fluxos\|API GraphQL\|Servidor MCP\|Chat com agente"

# E2E
E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/home.spec.ts e2e/integracao.spec.ts --project=chromium --reporter=line

# Manual:
# 1. GET / → Seção 3 mostra 3 colunas (Difusão, Inteligência, Integração)
# 2. Scroll até Features → 9 cards, os 3 últimos com badge "em breve" e cor violeta
# 3. Scroll até Roadmap → 4 cards, incluindo GraphQL pública e Ecossistema agêntico
# 4. Clicar em "Ver documentação" em algum dos 3 novos features → /integracao
# 5. /integracao carrega com hero + 3 seções stub
```

---

## Notas de decisão

**Por que não adicionar esses 3 em `/para-orgaos`?** Porque a landing virou a home (`/`) — é lá que esses serviços precisam aparecer para conquistar o público técnico que chega via SEO, GitHub, Slack compartilhado, etc.

**Por que não fazer 3 páginas separadas (`/graphql`, `/mcp`, `/chat`)?** Overkill no início. Uma página `/integracao` unificada é mais fácil de manter enquanto os 3 estão em estágios diferentes de maturidade. Quando GraphQL estiver em produção e tivermos demanda real, dá pra quebrar.

**Por que não tirar Panorama do fluxo Inteligência pra colocar em Integração?** Porque Panorama é uma **interface humana** (dashboard Streamlit), não programática. Ele fica certo em Inteligência.

**Por que "em breve" nos 3 cards?** Honestidade institucional. Nada do DGB foi lançado publicamente ainda, e os 3 serviços estão em estados diferentes (MCP já implementado, GraphQL em TDD, Chat ainda planejado). Marcar como "em breve" é mais seguro e alinhado com o tom de roadmap transparente da landing.

**Qual a relação com o MCP server que já existe no LAB?** O `LAB/govbrnews-mcp` é real e funcional. Ele pode ser o link "Ver repositório MCP" do FeatureCard correspondente se o repo for público. A página `/integracao` também pode ter um snippet mostrando como adicionar a um `claude_desktop_config.json`.
