---
name: reuse-components
description: Diretrizes de reutilização de componentes do projeto portal. Use esta skill ao escrever, revisar ou refatorar componentes React no portal para garantir que componentes comuns existentes sejam sempre reutilizados em vez de criar elementos HTML nativos isolados. Triggers em qualquer tarefa de implementação, revisão de código ou criação de componentes.
license: MIT
metadata:
  author: portal-team
  version: "1.0.0"
---

# Reutilização de Componentes do Portal

Diretrizes obrigatórias para garantir consistência visual e de comportamento em todo o projeto, priorizando sempre o uso de componentes comuns existentes.

## Regra Principal

**NUNCA crie elementos HTML nativos isolados quando já existe um componente comum no projeto que cumpre a mesma função.** Sempre verifique `src/components/ui/` e `src/components/` antes de escrever qualquer elemento de interface.

## Quando Aplicar

- Ao implementar qualquer funcionalidade nova
- Ao revisar ou refatorar código existente
- Ao corrigir bugs que envolvam interface
- Ao adicionar elementos interativos a qualquer página

## Catálogo de Componentes Obrigatórios

### Componentes UI Base (`src/components/ui/`)

Estes componentes são baseados em shadcn/ui (Radix UI) e possuem estilos, acessibilidade e variantes padronizados.

| Componente | Import | Substitui | Variantes/Props |
|------------|--------|-----------|-----------------|
| `Button` | `@/components/ui/button` | `<button>`, `<a>` com aparência de botão | `variant`: default, destructive, outline, secondary, ghost, link / `size`: default, sm, lg, icon / `asChild` para compor com `<Link>` |
| `Input` | `@/components/ui/input` | `<input>` | Suporta todas as props de `<input>` nativo |
| `Label` | `@/components/ui/label` | `<label>` | Vinculado ao Input via `htmlFor` |
| `Card` | `@/components/ui/card` | `<div>` com estilos de card | Subcomponentes: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | `@/components/ui/badge` | `<span>` de tag/etiqueta | Aceita `className` para customização |
| `Select` | `@/components/ui/select` | `<select>` nativo | Subcomponentes: `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` |
| `Tabs` | `@/components/ui/tabs` | Navegação por abas manual | Subcomponentes: `TabsList`, `TabsTrigger`, `TabsContent` |
| `Tooltip` | `@/components/ui/tooltip` | `title` attribute, tooltips manuais | `TooltipProvider`, `TooltipTrigger`, `TooltipContent` |
| `Separator` | `@/components/ui/separator` | `<hr>`, `<div>` com borda | `orientation`: horizontal, vertical |
| `Avatar` | `@/components/ui/avatar` | `<img>` de avatar manual | `AvatarImage`, `AvatarFallback` |
| `DropdownMenu` | `@/components/ui/dropdown-menu` | Menus dropdown manuais | `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` |
| `Sheet` | `@/components/ui/sheet` | Sidebars/drawers manuais | `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle` |
| `Carousel` | `@/components/ui/carousel` | Carrosséis manuais | `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` |

### Componentes de Negócio (`src/components/`)

| Componente | Import | Uso |
|------------|--------|-----|
| `NewsCard` | `@/components/articles/NewsCard` | Card de notícia com imagem, tema, data. Props: `title`, `summary`, `theme`, `internalUrl`, `date`, `imageUrl`, `isMain`, `trackingOrigin` |
| `SearchBar` | `@/components/search/SearchBar` | Barra de busca com autocomplete, debounce e sugestoes |
| `MarkdownRenderer` | `@/components/common/MarkdownRenderer` | Renderização de conteúdo markdown. Props: `content`, `className` |
| `AuthButton` | `@/components/auth/AuthButton` | Botão de login/logout com suporte a provedores |
| `Header` | `@/components/layout/Header` | Header do portal |
| `Footer` | `@/components/layout/Footer` | Footer do portal |
| `Portal` | `@/components/layout/Portal` | Layout wrapper do portal |
| `Providers` | `@/components/common/Providers` | Provider de sessão e QueryClient |
| `FeedLink` | `@/components/common/FeedLink` | Link para feeds RSS/Atom |
| `KpiCard` | `@/components/dashboard/KpiCard` | Card de KPI para dashboards |
| `ChartTooltip` | `@/components/dashboard/ChartTooltip` | Tooltip customizado para gráficos |
| `VideoPlayer` | `@/components/articles/VideoPlayer` | Player de vídeo para artigos |
| `ImageCarousel` | `@/components/articles/ImageCarousel` | Carrossel de imagens em artigos |

## Regras Detalhadas

### 1. Botões — SEMPRE usar `<Button>`

> Para guia detalhado de **todos** os padrões de botão (toggles, chips, icon buttons, dropdown triggers, etc.), veja a skill `use-button-component`.

```tsx
// ERRADO — nunca faça isso
<button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleClick}>
  Enviar
</button>

// CORRETO
import { Button } from "@/components/ui/button";

<Button onClick={handleClick}>Enviar</Button>
<Button variant="outline" size="sm">Cancelar</Button>
<Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
```

Para botões que são links, use `asChild` com `<Link>`:

```tsx
// ERRADO
<a href="/artigos" className="bg-primary text-white px-4 py-2 rounded">Ver artigos</a>

// CORRETO
import { Button } from "@/components/ui/button";
import Link from "next/link";

<Button asChild>
  <Link href="/artigos">Ver artigos</Link>
</Button>
```

### 2. Inputs — SEMPRE usar `<Input>`

```tsx
// ERRADO
<input type="text" className="border rounded px-3 py-2" placeholder="Nome" />

// CORRETO
import { Input } from "@/components/ui/input";

<Input type="text" placeholder="Nome" />
```

### 3. Cards — SEMPRE usar `<Card>` e subcomponentes

```tsx
// ERRADO
<div className="border rounded-lg shadow p-4">
  <h3>Título</h3>
  <p>Descrição</p>
</div>

// CORRETO
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    {/* conteúdo */}
  </CardContent>
</Card>
```

### 4. Badges/Tags — SEMPRE usar `<Badge>`

```tsx
// ERRADO
<span className="bg-gray-100 text-sm px-2 py-0.5 rounded-full">Categoria</span>

// CORRETO
import { Badge } from "@/components/ui/badge";

<Badge>Categoria</Badge>
```

### 5. Cards de notícia — SEMPRE usar `<NewsCard>`

```tsx
// ERRADO — criar um card de notícia manualmente
<div className="border rounded">
  <img src={article.image} />
  <h3>{article.title}</h3>
  <p>{article.summary}</p>
</div>

// CORRETO
import NewsCard from "@/components/articles/NewsCard";

<NewsCard
  title={article.title}
  summary={article.summary}
  theme={article.theme_1_level_1_label}
  internalUrl={`/artigos/${article.unique_id}`}
  date={article.published_at}
  imageUrl={article.image}
/>
```

### 6. Markdown — SEMPRE usar `<MarkdownRenderer>`

```tsx
// ERRADO
<div dangerouslySetInnerHTML={{ __html: content }} />

// CORRETO
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";

<MarkdownRenderer content={article.content} />
```

### 7. Selects — SEMPRE usar `<Select>` do shadcn/ui

```tsx
// ERRADO
<select className="border rounded px-3 py-2">
  <option value="a">Opção A</option>
</select>

// CORRETO
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Escolha..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Opção A</SelectItem>
  </SelectContent>
</Select>
```

## Checklist de Revisão

Ao finalizar qualquer implementação, verifique:

- [ ] Nenhum `<button>` nativo — use `<Button>`
- [ ] Nenhum `<input>` nativo — use `<Input>`
- [ ] Nenhum `<select>` nativo — use `<Select>`
- [ ] Nenhum `<label>` nativo — use `<Label>`
- [ ] Nenhum card manual com `<div>` estilizado — use `<Card>`
- [ ] Nenhum badge/tag manual — use `<Badge>`
- [ ] Nenhum tooltip manual — use `<Tooltip>`
- [ ] Nenhum card de notícia manual — use `<NewsCard>`
- [ ] Nenhum `dangerouslySetInnerHTML` para markdown — use `<MarkdownRenderer>`
- [ ] Nenhum dropdown manual — use `<DropdownMenu>`
- [ ] Nenhum separador com `<hr>` ou borda — use `<Separator>`

## Adicionando Novos Componentes UI

Se realmente precisar de um componente shadcn/ui que ainda não existe no projeto:

```bash
npx shadcn-ui@latest add [component-name]
```

Isso garante que o componente siga o padrão do design system e fique disponível para todo o projeto em `src/components/ui/`.

## Customização de Componentes Existentes

Todos os componentes UI aceitam `className` para customização via Tailwind. Use isso em vez de criar variantes locais:

```tsx
// CORRETO — customizar via className
<Button className="w-full mt-4" variant="outline">
  Ação customizada
</Button>

<Card className="bg-gradient-to-r from-blue-50 to-green-50">
  {/* card com fundo personalizado */}
</Card>
```
