# Plano: Landing Page para Órgãos — `/para-orgaos`

## Context

O DGB começou como um portal de busca de notícias governamentais com foco no **cidadão comum**, mas esse público ainda não foi alcançado. Em paralelo, surgiu alcance real junto a **gestores públicos e ASCOMs** (Assessorias de Comunicação) — que são tanto o público com acesso imediato quanto a alavanca estratégica para a missão institucional do DGB.

A percepção que precisa ser consolidada: o DGB **não é um serviço ao cidadão**, é uma **plataforma** que robustece as rotinas de **Comunicação** e **Inteligência** dos órgãos. O órgão continua sendo quem fala com o cidadão — o DGB fornece o megafone e o radar.

Esta landing page vai cunhar essa narrativa publicamente, organizar as features existentes sob um guarda-chuva coerente, e abrir caminho para conversas com ASCOMs.

---

## Parte 1: Narrativa e posicionamento

### Positioning statement (frase-âncora)

> **DestaquesGovBr é a Web Difusora do governo federal: a plataforma que amplifica a comunicação dos órgãos e acelera a inteligência de quem gere o serviço público.**

Essa frase contém as três escolhas de posicionamento:

1. **"Web Difusora"** — metáfora forte, institucional, remete ao rádio difusor público (continuidade com a tradição da comunicação estatal).
2. **"amplifica a comunicação"** — endereça a ASCOM (outbound: produzir e difundir).
3. **"acelera a inteligência"** — endereça o gestor (inbound: monitorar e decidir).

### Tensões de comunicação (o que a landing precisa resolver)

| Antes (percepção atual) | Depois (posicionamento desejado) |
|---|---|
| "Portal de notícias para cidadãos" | "Plataforma de comunicação e inteligência para órgãos" |
| Serviço-fim | Serviço-meio (infraestrutura) |
| Competidor dos portais dos órgãos | Parceiro que fortalece os portais dos órgãos |
| Feature: busca | Feature: ecossistema integrado (Difusão + Inteligência) |

### Arquitetura narrativa: os dois fluxos

A landing organiza tudo em dois fluxos complementares. Essa dualidade é o espinha dorsal da narrativa:

```
            ┌─────────────────────────────────────────┐
            │          DestaquesGovBr                 │
            │           Web Difusora                  │
            └─────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌──────────────────────┐       ┌──────────────────────┐
│  DIFUSÃO (outbound)  │       │ INTELIGÊNCIA (inbound)│
│                      │       │                      │
│  Órgão → Cidadão     │       │  Cidadão/Gov → Órgão │
│                      │       │                      │
│ • Widgets            │       │ • Clipping            │
│ • RSS                │       │ • Panorama (beta)    │
│ • WebPush            │       │ • Dash do Órgão (wip)│
│ • Barra de Busca     │       │                      │
│ • Clipping público   │       │                      │
└──────────────────────┘       └──────────────────────┘
```

---

## Parte 2: Estrutura da landing `/para-orgaos`

Segue um padrão **B2B SaaS landing** adaptado ao contexto institucional: Hero → Problema → Solução em dois fluxos → Features → Prova → CTA. Cada seção tem um papel específico na jornada cognitiva do visitante.

### Seção 1 — Hero *(above the fold)*

**Papel:** Em 3 segundos, o gestor precisa entender (a) o que é, (b) pra quem é, (c) que resolve o problema dele.

```
──────────────────────────────────────────────
  A Web Difusora do governo federal

  DestaquesGovBr fortalece a comunicação do seu
  órgão com cidadãos — e entrega aos gestores uma
  visão em tempo real da agenda governamental.

  [Conhecer para meu órgão]  [Ver demonstração]
──────────────────────────────────────────────
     (visual à direita: um mockup com clipping
      + widget + busca + notificações)
```

**Copy final:**

- **Eyebrow:** `Para órgãos do governo federal`
- **H1:** `A Web Difusora do governo federal`
- **Subtítulo:** `Fortalecemos a comunicação do seu órgão com o cidadão, e entregamos aos gestores um radar em tempo real sobre a agenda do governo. Tudo como plataforma — o seu portal continua sendo o protagonista.`
- **CTA primário:** `Conhecer para meu órgão`
- **CTA secundário:** `Ver demonstração` *(link para `/para-orgaos/web-difusora` — o showcase)*

### Seção 2 — Problema *(PAS: Problem-Agitate-Solve, fase 1)*

**Papel:** Espelhar a dor do gestor em linguagem que ele reconhece, criando ressonância antes de apresentar a solução.

```
O dia a dia de quem comunica no serviço público
é feito de ferramentas desconectadas, planilhas
de clipping, screenshots no WhatsApp, e a sensação
de que a mensagem do órgão se perde no ruído.
```

**Copy final:**

- **H2:** `O desafio de comunicar no serviço público hoje`
- **Parágrafo:** `Produzir boas notícias e entregá-las ao público certo ainda depende de rotinas manuais: clippings montados à mão, planilhas que ninguém atualiza, screenshots no WhatsApp, e portais de órgãos com pouca capacidade de difusão. Do outro lado, ministros e secretários precisam de um panorama estratégico do que está sendo dito — sobre seu órgão, sobre o governo, sobre o país — e não têm tempo para reunir isso manualmente.`
- **Grid de 3 pain points** (ícones + uma frase cada):
  1. **Clipping manual toma horas por dia** — e ainda assim fica incompleto ou fora de hora.
  2. **Portais com baixa difusão** — o conteúdo é produzido mas não chega onde precisa chegar.
  3. **Visão fragmentada do governo** — cada gestor monta seu próprio painel à base de links e e-mails.

### Seção 3 — Solução em dois fluxos *(o núcleo narrativo)*

**Papel:** Apresentar os dois braços do DGB como um sistema coerente. Essa é a seção que *ensina* o modelo mental.

```
┌──────────────────────┬──────────────────────┐
│   DIFUSÃO            │   INTELIGÊNCIA        │
│   (comunicação)       │   (análise)            │
│                      │                      │
│  para a ASCOM         │  para o gestor        │
└──────────────────────┴──────────────────────┘
```

**Copy final — bloco DIFUSÃO:**

- **Eyebrow:** `Para ASCOMs`
- **H3:** `Amplifique a voz do seu órgão`
- **Parágrafo:** `O DGB entrega um conjunto de componentes prontos para você embarcar no portal do seu órgão. Seus leitores ganham widgets de notícias, notificações em tempo real, feeds para quem quer integrar, uma barra de busca inteligente e uma galeria de clippings temáticos — sem que seu órgão precise desenvolver nada disso internamente.`
- **Lista de benefícios:**
  - **Autonomia editorial:** o órgão continua no comando do conteúdo e da identidade visual
  - **Zero desenvolvimento:** integração por embed, feed ou link
  - **Transparência:** o cidadão vê o conteúdo no portal do órgão, não num terceiro
- **CTA:** `Ver as ferramentas de difusão` *(âncora para Seção 4)*

**Copy final — bloco INTELIGÊNCIA:**

- **Eyebrow:** `Para gestores`
- **H3:** `Acompanhe a agenda do governo em tempo real`
- **Parágrafo:** `Ministros, secretários, diretores e assessores têm acesso a clippings personalizados, entregues automaticamente por e-mail, Telegram ou push, cobrindo os temas e órgãos que importam para cada função. Para quem precisa de visão agregada, o Panorama oferece o recorte analítico da comunicação governamental das últimas semanas.`
- **Lista de benefícios:**
  - **Monitore seu órgão e o governo** com a mesma ferramenta
  - **Clippings com resumo editorial** feitos por IA, não só listas de links
  - **Entrega no canal certo:** e-mail, Telegram, WebPush
- **CTA:** `Ver as ferramentas de inteligência` *(âncora para Seção 4)*

### Seção 4 — Features em detalhe *(cada uma com papel no fluxo)*

**Papel:** Para o visitante que rolou até aqui, mostrar **o quê exatamente** existe. Cada feature é tagueada com a qual fluxo pertence (Difusão ou Inteligência ou ambos).

Formato: cards 2x3 ou lista vertical com ícone, título, descrição curta, badge de fluxo, e link para demo.

| # | Feature | Fluxo | Copy curto |
|---|---|---|---|
| 1 | **Clipping** | Ambos | Monte recortes temáticos do governo federal com IA. Receba por e-mail, Telegram ou push — ou publique como página pública para compartilhar com cidadãos. |
| 2 | **Widget de notícias** | Difusão | Um bloco de notícias configurável para embutir no portal do seu órgão. Escolha layout, filtros e identidade. |
| 3 | **WebPush** | Difusão | O sininho de notificações: cidadãos se inscrevem no portal do seu órgão e recebem alertas em tempo real. |
| 4 | **Feeds RSS/Atom/JSON** | Difusão | Feeds padronizados por órgão, tema ou clipping. Compatível com qualquer leitor ou integração. |
| 5 | **Barra de Busca Inteligente** | Difusão | Busca semântica com RAG, autocomplete e preview, filtrável pelas notícias do seu órgão. |
| 6 | **Panorama Gov.BR** *(experimental)* | Inteligência | Dashboard analítico com temas emergentes, volume por órgão e tendências discursivas. |

**Copy final (cabeçalho da seção):**
- **H2:** `Um kit para cada necessidade`
- **Parágrafo:** `Você pode adotar qualquer uma das ferramentas isoladamente, ou combiná-las para um portal governamental completo — o que chamamos de Web Difusora.`

### Seção 5 — Showcase Web Difusora *(teaser visual)*

**Papel:** Convidar para o showcase (página separada) através de um teaser visual atrativo.

```
┌──────────────────────────────────────────────┐
│                                              │
│  Como seu portal fica com a Web Difusora     │
│                                              │
│  [mockup simplificado com setas apontando    │
│   para widget, sininho, barra de busca]      │
│                                              │
│      [Ver a demonstração completa →]         │
│                                              │
└──────────────────────────────────────────────┘
```

**Copy final:**
- **H2:** `Como seu portal fica com a Web Difusora`
- **Parágrafo:** `Cada ferramenta foi pensada para se encaixar naturalmente no portal do seu órgão, respeitando sua identidade visual. Veja um exemplo de portal modelo com os componentes do DGB integrados.`
- **CTA:** `Ver a demonstração completa →` *(link para `/para-orgaos/web-difusora`)*

### Seção 6 — Em breve *(roadmap transparente)*

**Papel:** Sinalizar evolução sem criar expectativa falsa. Importante para instituições: transmite maturidade de planejamento.

```
Próximos passos na plataforma
├─ Gerar notícia com IA (a partir de um clipping)
├─ Dashboard do Órgão (visão executiva integrada)
└─ Integração nativa com ASCOM Workflow
```

**Copy final:**
- **Eyebrow:** `Roadmap`
- **H2:** `Em desenvolvimento`
- **Bloco 1 — Gerar notícia com IA:** `A partir de um clipping, gere um rascunho de notícia no tom e estilo do seu órgão. O clipping vira motor editorial, não apenas ferramenta de leitura.`
- **Bloco 2 — Dashboard do Órgão:** `Uma área logada com visão integrada da comunicação do seu órgão e do contexto governamental. Enquanto isso, experimente a versão preliminar no `[Panorama Gov.BR](link)`.`
- **Bloco 3 — Web Difusora como padrão nacional:** `Nossa aposta é que as ferramentas do DGB se tornem parte natural de qualquer portal governamental — um megafone cívico compartilhado.`

### Seção 7 — Prova / Confiabilidade institucional

**Papel:** Reduzir risco percebido. Instituições são conservadoras — precisam ver que outras adotaram, que o projeto é sólido, que é transparente.

**Elementos:**
- Logos de órgãos que já usam *(quando houver)* ou logo do gov.br + "projeto aberto, construído sobre padrões gov.br"
- Stats: `150+ portais monitorados · 500k+ notícias indexadas · X clippings ativos · Y widgets embarcados`
- Link para `/transparencia-algoritmica` como diferencial: `Algoritmos documentados publicamente`
- Link para repositório GitHub: `Código-fonte aberto`

**Copy final:**
- **H2:** `Transparente por construção`
- **Parágrafo:** `O DestaquesGovBr é um projeto aberto, com código público, algoritmos documentados e dados estruturados disponíveis para consulta. Porque a confiança no serviço público começa na forma como ele é construído.`

### Seção 8 — CTA final

**Papel:** Fechar a jornada convidando à conversa. Para instituições, o CTA mais forte raramente é "cadastre-se já" — é "vamos conversar".

```
┌──────────────────────────────────────────────┐
│                                              │
│      Quer trazer o DGB para o seu órgão?     │
│                                              │
│      [Falar com a equipe]  [Ver o projeto]   │
│                                              │
└──────────────────────────────────────────────┘
```

**Copy final:**
- **H2:** `Vamos conversar sobre o seu órgão`
- **Parágrafo:** `Se você faz parte de uma assessoria de comunicação, é gestor público ou simplesmente quer entender como o DGB pode se encaixar na rotina do seu órgão, fale com a gente.`
- **CTA primário:** `Falar com a equipe` *(abre mailto ou formulário simples)*
- **CTA secundário:** `Ver no GitHub`

---

## Parte 3: Showcase `/para-orgaos/web-difusora`

Página separada, linkada da landing (Seção 5 e CTA secundário do Hero).

**Conceito:** Um mockup em tela inteira de um "portal governamental genérico" — estrutura em cinza (header, menu, hero do portal, grid de notícias, footer) — com os componentes do DGB destacados em cor e acompanhados de callouts explicativos.

**Estrutura visual:**

```
┌────────────────────────────────────────────────────┐
│  [header fictício: MINISTÉRIO DA XPTO]             │
│                            ┌──────────┐            │
│                            │ 🔍 Busca │ ← callout │
│                            └──────────┘  "Barra    │
│                                           Inteli-  │
│                                           gente"   │
│ ┌──────────────────────────┐               ┌────┐  │
│ │                          │               │ 🔔 │  │
│ │     HERO DO PORTAL       │               └────┘  │
│ │     (gris do órgão)      │              ↑        │
│ │                          │              WebPush  │
│ └──────────────────────────┘                       │
│                                                    │
│ ┌─── Notícias recentes ─┐    ┌──── Clippings ────┐ │
│ │  [Widget DGB colorido] │    │ [Card clipping]  │ │
│ │  [cards de notícia]    │    │ [Card clipping]  │ │
│ └────────────────────────┘    └──────────────────┘ │
│        ↑                              ↑           │
│      Widget                        Galeria de     │
│      (embed)                        clippings     │
│                                                    │
│ ┌────────────────────────────────────┐             │
│ │  📡 RSS / JSON Feed                │ ← callout  │
│ └────────────────────────────────────┘  "Feeds"    │
│                                                    │
│ [footer fictício]                                  │
└────────────────────────────────────────────────────┘
```

**Copy do cabeçalho do showcase:**
- **H1:** `Web Difusora: o portal do seu órgão em modo amplificado`
- **Subtítulo:** `Esta é uma demonstração visual de como um portal governamental genérico fica após adotar o pacote de ferramentas do DGB. Os elementos em cor são o que o DGB adiciona — tudo ao redor é o portal do seu órgão, preservado como está.`

**Cada callout** (6 ao total — um por ferramenta) tem:
- Ícone colorido
- Nome da ferramenta
- 2 linhas explicativas
- Link "Saiba mais →" para a seção correspondente na landing

**Final da página — cta para conversação:**
- `Pronto para trazer isso para o seu portal?` → botão para contato

---

## Parte 4: Glossário de termos (para você se apropriar)

Como você pediu pra aprender a terminologia, aqui vão os conceitos-chave que eu usei no plano — todos são padrão em UX/marketing B2B:

| Termo | O que significa |
|---|---|
| **Positioning statement** | A frase-âncora que define *o que* você é, *para quem*, e *que problema resolve*. Tudo na landing deve derivar dela. |
| **Above the fold** | Tudo que aparece antes do usuário rolar a tela. No Hero você tem ~3 segundos e ~2 linhas de texto para ganhar a atenção. |
| **Value proposition** | A promessa concreta de valor que o produto entrega. Diferente de features — foca no benefício. |
| **PAS (Problem-Agitate-Solve)** | Estrutura clássica de copy B2B: primeiro nomear a dor, depois intensificar (porque o visitante precisa se sentir visto), só então oferecer a solução. |
| **Pain points** | Dores específicas e reconhecíveis que o produto resolve. Quanto mais concretas, melhor. |
| **Eyebrow** | Texto curto acima de um H1/H2 que contextualiza (ex: "Para ASCOMs"). Facilita escaneamento. |
| **Microcopy** | Textos curtos em botões, labels, tooltips. Pequenos mas críticos para conversão. |
| **CTA (Call-to-Action)** | Ação que você quer que o visitante execute. Landing bem feita tem 1 CTA primário forte e 1-2 secundários. |
| **Social proof** | Logos de clientes, depoimentos, números. Reduzem risco percebido. Em contexto institucional, substituímos "clientes" por "órgãos adotantes". |
| **F-pattern / Z-pattern** | Padrões de leitura ocular. O Hero normalmente segue o Z (olho vai topo-esquerda → topo-direita → diagonal → bottom). Copy importante vai nos pontos do Z. |
| **Information architecture** | Como a informação é organizada e hierarquizada. Nossa IA aqui é: dois fluxos (Difusão + Inteligência) como modelo mental principal. |
| **Narrativa 'problem → solution → outcome'** | Arco narrativo B2B: primeiro o problema do leitor, depois como o produto resolve, depois como fica a vida dele depois. |
| **Feature vs. Benefit** | Feature = o que o produto faz. Benefit = o que muda para o usuário. Landing boa fala benefits, não features. Ex: feature "Widget embedável" → benefit "Sem desenvolvimento interno". |

---

## Parte 5: Arquitetura técnica

### Rotas a criar

| Rota | Propósito | Arquivo |
|---|---|---|
| `/para-orgaos` | Landing page principal | `src/app/(public)/para-orgaos/page.tsx` |
| `/para-orgaos/web-difusora` | Showcase com mockup anotado | `src/app/(public)/para-orgaos/web-difusora/page.tsx` |

### Componentes a criar

Como não existem componentes de landing hoje, criar um pequeno kit reutilizável:

| Componente | Arquivo | Propósito |
|---|---|---|
| `LandingHero` | `src/components/landing/LandingHero.tsx` | Hero com eyebrow, H1, subtítulo, CTAs duplos e slot para visual |
| `LandingSection` | `src/components/landing/LandingSection.tsx` | Wrapper com padding/max-width consistentes e variantes (default/muted) |
| `FeatureCard` | `src/components/landing/FeatureCard.tsx` | Card com ícone, título, descrição, badge de fluxo, link |
| `FlowBadge` | `src/components/landing/FlowBadge.tsx` | Badge colorido "Difusão" (azul) ou "Inteligência" (verde) ou "Ambos" |
| `PainPointGrid` | `src/components/landing/PainPointGrid.tsx` | Grid de 3 pain points com ícones |
| `StatsBar` | `src/components/landing/StatsBar.tsx` | Linha de stats numéricos (150+ portais, etc) |
| `ShowcaseMockup` | `src/components/landing/ShowcaseMockup.tsx` | Mockup anotado do portal fictício — componente estático SVG/HTML-CSS |
| `CalloutAnnotation` | `src/components/landing/CalloutAnnotation.tsx` | Etiqueta anotada no showcase com setinha e texto explicativo |

### Reutilização

Componentes existentes que podemos reaproveitar:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription` de `src/components/ui/card.tsx`
- `Button` de `src/components/ui/button.tsx`
- `Badge` de `src/components/ui/badge.tsx`
- `MarkdownRenderer` de `src/components/common/MarkdownRenderer.tsx` (se parte do copy vier de MD)
- Ícones da `lucide-react` já em uso

### Link a partir do menu principal

Adicionar link `Para Órgãos` no header (`src/components/layout/Header.tsx`) dentro do array `routeLinks`, depois de `Clippings`:

```tsx
const routeLinks = [
  { href: '/artigos', label: 'Notícias' },
  { href: '/orgaos', label: 'Órgãos' },
  { href: '/temas', label: 'Temas' },
  { href: '/clippings', label: 'Clippings' },
  { href: '/para-orgaos', label: 'Para Órgãos' },
]
```

### Conteúdo em Markdown vs. JSX

Para facilitar iteração de copy sem precisar editar componentes:

- Copy longo (parágrafos explicativos, seção Sobre) pode ficar em `content/para-orgaos.md` e ser renderizado com `MarkdownRenderer`
- Estrutura e layout ficam em `page.tsx` (JSX)
- Isso segue o padrão já estabelecido por `content/transparencia-algoritmica.md`

### Metadata / SEO

- `<title>`: "Para Órgãos — DestaquesGovBr"
- `<meta description>`: Usa o positioning statement
- OG tags para compartilhamento em Slack/WhatsApp (importante para alcance institucional)

---

## Parte 6: Sequência de implementação

1. **Componentes base da landing** (`LandingHero`, `LandingSection`, `FeatureCard`, `FlowBadge`, `PainPointGrid`, `StatsBar`)
2. **Rota `/para-orgaos`** com as 8 seções + copy final
3. **Link no header** (`Para Órgãos`)
4. **Showcase mockup** (`ShowcaseMockup`, `CalloutAnnotation`)
5. **Rota `/para-orgaos/web-difusora`** com mockup + callouts
6. **OG tags e metadata** para ambas as rotas
7. **Ajuste do Hero da home atual** (`/`) — pequeno callout "Você é de um órgão público? → /para-orgaos" para não perder o público no fluxo atual

## Verificação

```bash
# Type check
cd portal && npx tsc --noEmit 2>&1 | grep -v pubsub | grep -v lista-espera | grep -v telegram/__tests__

# Dev server
cd portal && pnpm dev

# Visitar manualmente:
# - http://localhost:3000/para-orgaos          → landing principal
# - http://localhost:3000/para-orgaos/web-difusora  → showcase
# - Verificar que o link "Para Órgãos" aparece no menu
# - Verificar todos os links internos funcionam (âncoras das seções, CTAs, showcase)
# - Testar em mobile (responsive)
# - Verificar OG preview com https://www.opengraph.xyz/ (ou similar)
```

---

## Sugestões futuras (fora do escopo desta landing, mas conectadas)

- **`/para-orgaos/clipping`, `/para-orgaos/widgets`** — landings específicas por feature para SEO de cauda longa
- **Formulário de contato real** em `/para-orgaos/contato` substituindo o `mailto:`
- **Botão "Gerar notícia com IA"** na página de release de um clipping — concretiza a narrativa "clipping como motor editorial" (mencionado na seção Em breve)
- **Versão logada do Dashboard do Órgão** — dá materialidade à promessa de "Inteligência" da landing
