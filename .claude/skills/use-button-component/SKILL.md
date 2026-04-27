---
name: use-button-component
description: Regra de enforcement do componente Button. Use esta skill ao escrever, revisar ou refatorar qualquer elemento clicavel no portal. Triggers em qualquer codigo que renderize botoes, toggles, chips, triggers de dropdown, botoes de icone, ou elementos interativos com onClick.
license: MIT
metadata:
  author: portal-team
  version: "1.0.0"
---

# Sempre use `<Button>` — nunca `<button>` nativo

Todo elemento clicavel deve usar o componente `Button` de `@/components/ui/button`. O `<button>` HTML nativo **nao deve ser usado** em nenhum componente do projeto.

## Por que?

O componente `Button` fornece automaticamente:

- **Focus ring** acessivel (`focus-visible:ring-2 focus-visible:ring-ring`)
- **Estado disabled** consistente (`disabled:pointer-events-none disabled:opacity-50`)
- **Dimensionamento de SVG** padrao (`[&_svg]:size-4 [&_svg]:shrink-0`)
- **Transicoes** suaves (`transition-colors`)
- **Tipografia** consistente (`text-sm font-medium`)
- **Espacamento** entre icone e texto (`gap-2`)
- **Border radius** padrao (`rounded-md`)
- **Cores** do design system via variantes

Quando voce usa `<button>` nativo, **nenhum** desses comportamentos vem de graca e precisa ser reimplementado manualmente — gerando inconsistencia visual e de acessibilidade.

## Quando aplicar

- Ao implementar qualquer funcionalidade nova com elementos clicaveis
- Ao revisar ou refatorar codigo existente
- Ao criar componentes com toggles, chips, triggers, ou acoes

## Tabela de mapeamento

| Preciso de... | Use |
|---|---|
| Botao de acao primaria (Enviar, Salvar) | `<Button>` |
| Botao de acao secundaria (Cancelar) | `<Button variant="outline">` |
| Botao destrutivo (Excluir) | `<Button variant="destructive">` |
| Botao de icone (fechar, copiar, buscar) | `<Button variant="ghost" size="icon">` |
| Remocao em tag/chip (x pequeno) | `<Button variant="ghost" size="icon" className="h-4 w-4 p-0">` |
| Toggle/chip (frequencia, modo, filtro) | `<Button variant="outline" size="sm" className="rounded-full">` |
| Trigger de dropdown customizado | `<Button variant="outline" className="w-full justify-between">` |
| Link inline (texto sublinhado clicavel) | `<Button variant="link" className="h-auto p-0">` |
| Step indicator (numero em wizard) | `<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full p-0">` |
| Collapse/expand (arvore, accordion) | `<Button variant="ghost" size="icon" className="h-6 w-6 p-0">` |
| Dentro de TooltipTrigger | `<TooltipTrigger asChild><Button variant="ghost" size="icon">` |
| Card de selecao (layout, tamanho) | `<Button variant="outline" className="h-auto p-4 text-left">` |
| Navegacao carousel (prev/next) | `<Button variant="ghost" size="icon" className="rounded-full">` |
| Botao que e link | `<Button asChild><Link href="...">` |
| Selecionar/desmarcar todos | `<Button variant="link" className="h-auto p-0 text-xs">` |
| Limpar campo (x no input) | `<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">` |

## Exemplos ERRADO / CORRETO

### 1. Botoes de acao (Like, Follow, Copy)

```tsx
// ERRADO
<button
  type="button"
  onClick={handleLike}
  disabled={liking}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer transition-colors bg-background hover:bg-accent"
>
  <Heart className="h-4 w-4" />
  Curtir
</button>

// CORRETO
<Button
  variant="ghost"
  size="sm"
  onClick={handleLike}
  disabled={liking}
  className="gap-1.5"
>
  <Heart className="h-4 w-4" />
  Curtir
</Button>
```

### 2. Toggle/chip com estado ativo/inativo

```tsx
// ERRADO
<button
  type="button"
  onClick={() => toggleFrequency('daily')}
  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-background border-input hover:bg-accent'
  }`}
>
  Diarios
</button>

// CORRETO
<Button
  variant={active ? "default" : "outline"}
  size="sm"
  onClick={() => toggleFrequency('daily')}
  className="rounded-full"
>
  Diarios
</Button>
```

### 3. Remover tag/chip (x)

```tsx
// ERRADO
<button
  type="button"
  onClick={() => removeTag(key)}
  className="hover:text-red-600"
>
  &times;
</button>

// CORRETO
<Button
  variant="ghost"
  size="icon"
  onClick={() => removeTag(key)}
  className="h-4 w-4 p-0 hover:text-red-600"
>
  <X className="h-3 w-3" />
</Button>
```

### 4. Limpar campo/filtro

```tsx
// ERRADO
<button
  type="button"
  onClick={() => handleDateChange('start', undefined)}
  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
>
  <X className="h-4 w-4" />
</button>

// CORRETO
<Button
  variant="ghost"
  size="icon"
  onClick={() => handleDateChange('start', undefined)}
  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
>
  <X className="h-4 w-4" />
</Button>
```

### 5. Trigger de dropdown customizado

```tsx
// ERRADO
<button
  type="button"
  onClick={() => setIsOpen(!isOpen)}
  className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md text-sm"
>
  <span>{selectedLabel}</span>
  <ChevronDown className="h-4 w-4" />
</button>

// CORRETO
<Button
  variant="outline"
  onClick={() => setIsOpen(!isOpen)}
  className="w-full justify-between font-normal"
>
  <span>{selectedLabel}</span>
  <ChevronDown className="h-4 w-4" />
</Button>
```

### 6. Navegacao de carousel (prev/next)

```tsx
// ERRADO
<button
  type="button"
  onClick={scrollPrev}
  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-lg"
>
  <ChevronLeft className="w-5 h-5 text-primary" />
</button>

// CORRETO
<Button
  variant="ghost"
  size="icon"
  onClick={scrollPrev}
  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow-lg"
>
  <ChevronLeft className="w-5 h-5 text-primary" />
</Button>
```

### 7. Link inline (texto clicavel)

```tsx
// ERRADO
<button
  type="button"
  onClick={handleConnect}
  className="text-primary underline hover:no-underline text-xs"
>
  conectar Telegram
</button>

// CORRETO
<Button
  variant="link"
  onClick={handleConnect}
  className="h-auto p-0 text-xs"
>
  conectar Telegram
</Button>
```

### 8. Collapse/expand em arvore

```tsx
// ERRADO
<button
  type="button"
  onClick={() => onExpandToggle(node.code)}
  className="p-0 hover:bg-gray-200 rounded transition-colors"
>
  <ChevronDown className="h-4 w-4 transition-transform" />
</button>

// CORRETO
<Button
  variant="ghost"
  size="icon"
  onClick={() => onExpandToggle(node.code)}
  className="h-6 w-6 p-0"
>
  <ChevronDown className="h-4 w-4 transition-transform" />
</Button>
```

### 9. Step indicator em wizard

```tsx
// ERRADO
<button
  type="button"
  onClick={() => setStep(i)}
  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold bg-primary text-white"
>
  {i + 1}
</button>

// CORRETO
<Button
  variant={isActive ? "default" : "ghost"}
  size="icon"
  onClick={() => setStep(i)}
  className="h-7 w-7 rounded-full p-0 text-xs font-semibold"
>
  {i + 1}
</Button>
```

### 10. Botao dentro de TooltipTrigger

```tsx
// ERRADO
<TooltipTrigger asChild>
  <button
    type="button"
    className="p-1.5 rounded-full bg-muted/80 hover:bg-muted"
  >
    <Info className="w-4 h-4 text-muted-foreground" />
  </button>
</TooltipTrigger>

// CORRETO
<TooltipTrigger asChild>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted"
  >
    <Info className="w-4 h-4 text-muted-foreground" />
  </Button>
</TooltipTrigger>
```

### 11. Card de selecao (configurador)

```tsx
// ERRADO
<button
  type="button"
  onClick={() => setLayout('grid')}
  className={`p-4 border rounded-lg text-left ${
    layout === 'grid' ? 'border-primary ring-2 ring-primary/20' : 'border-input'
  }`}
>
  <span className="font-medium">Grid</span>
  <span className="text-sm text-muted-foreground">Layout em grade</span>
</button>

// CORRETO
<Button
  variant="outline"
  onClick={() => setLayout('grid')}
  className={cn(
    "h-auto p-4 text-left flex-col items-start",
    layout === 'grid' && "border-primary ring-2 ring-primary/20"
  )}
>
  <span className="font-medium">Grid</span>
  <span className="text-sm text-muted-foreground">Layout em grade</span>
</Button>
```

### 12. Copiar URL (icon button)

```tsx
// ERRADO
<button
  type="button"
  onClick={() => copyToClipboard(url)}
  className="shrink-0 p-2 hover:bg-muted rounded transition-colors"
  title="Copiar URL"
>
  <Copy className="w-4 h-4 text-muted-foreground" />
</button>

// CORRETO
<Button
  variant="ghost"
  size="icon"
  onClick={() => copyToClipboard(url)}
  title="Copiar URL"
>
  <Copy className="w-4 h-4 text-muted-foreground" />
</Button>
```

## Excecoes aceitaveis

Raw `<button>` e aceitavel **apenas** nestes casos:

1. **Indicadores de carousel (dots)** — circulos de 2-3px que servem como indicadores visuais, nao botoes de acao. O `Button` adicionaria sizing minimo incompativel.
2. **Painel de debug** (`ABDebugPanel.tsx`) — componente renderizado apenas em `NODE_ENV === 'development'`, nunca visivel em producao.
3. **Arquivos de teste** (`__tests__/`) — mocks e stubs em testes unitarios.

Em **qualquer outro caso**, use `<Button>`.

## Checklist de revisao

Ao finalizar qualquer implementacao com elementos clicaveis:

- [ ] Nenhum `<button` nativo no codigo novo
- [ ] Botoes de acao usam `<Button>` com variante adequada
- [ ] Botoes de icone usam `size="icon"` com dimensoes via className
- [ ] Toggle/chips usam `<Button variant="outline" size="sm">` com estilos condicionais
- [ ] Triggers de dropdown usam `<Button variant="outline" className="w-full justify-between">`
- [ ] Botoes dentro de `TooltipTrigger asChild` usam `<Button>`, nao `<button>`
- [ ] Botoes inline tipo link usam `<Button variant="link">`
- [ ] Se alguma excecao for necessaria, esta documentada com comentario `{/* raw button: <motivo> */}`
