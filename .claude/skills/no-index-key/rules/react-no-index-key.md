---
title: Nunca use index como key em .map()
impact: HIGH
impactDescription: Previne bugs de estado, re-renders desnecessários e problemas de reconciliação do React
tags: react, key, map, lista, renderização, reconciliação
---

## Nunca use index como key em .map()

Ao renderizar listas com `.map()` em React, **nunca** use o índice do array como prop `key`. Sempre use um identificador único e estável do item.

### Por que isso importa

O React usa a prop `key` para identificar qual elemento do DOM corresponde a qual item da lista durante a reconciliação. Quando você usa o índice como key:

1. **Bugs de estado**: Se itens forem reordenados, adicionados ou removidos, o React associa o estado interno (inputs, focus, animações) ao índice e não ao item, causando dados aparecerem no componente errado.
2. **Re-renders desnecessários**: O React não consegue detectar corretamente quais itens mudaram, removendo e recriando elementos desnecessariamente.
3. **Perda de estado em componentes controlados**: Campos de formulário, checkboxes e outros componentes com estado interno podem perder ou trocar valores entre si.

### Incorreto: usando index como key

```tsx
function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul>
      {articles.map((article, index) => (
        <li key={index}>
          <NewsCard title={article.title} imageUrl={article.image} />
        </li>
      ))}
    </ul>
  )
}
```

Se a lista for reordenada ou um item for removido do meio, o React vai reutilizar os nós DOM incorretamente, causando bugs visuais e de estado.

### Incorreto: usando index composto

```tsx
{articles.map((article, index) => (
  <NewsCard key={`article-${index}`} title={article.title} />
))}
```

Prefixar o índice com uma string não resolve o problema — o valor continua mudando quando a lista muda.

### Correto: usando identificador único

```tsx
function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul>
      {articles.map((article) => (
        <li key={article.unique_id}>
          <NewsCard title={article.title} imageUrl={article.image} />
        </li>
      ))}
    </ul>
  )
}
```

Use um campo que identifique unicamente o item: `id`, `unique_id`, `slug`, `uuid`, etc.

### Correto: usando campo composto quando não há ID único

```tsx
function ThemeArticles({ themes }: { themes: ThemeWithArticles[] }) {
  return (
    <div>
      {themes.map((theme) => (
        <section key={theme.label}>
          <h2>{theme.label}</h2>
          {theme.articles.map((article) => (
            <NewsCard key={article.unique_id} title={article.title} />
          ))}
        </section>
      ))}
    </div>
  )
}
```

Quando os itens não possuem um `id`, use um campo que seja único e estável dentro daquela lista (ex: `label`, `slug`, `name`).

### Quando é aceitável usar index como key

Em situações **muito específicas**, o index pode ser aceitável — mas ainda assim não é recomendado:

- A lista é **estática** e **nunca** será reordenada, filtrada ou modificada
- Os itens **não possuem** nenhum identificador estável
- Os itens **não possuem** estado interno (não são inputs, checkboxes, etc.)

Mesmo nesses casos, prefira gerar um identificador. Se não houver alternativa, documente explicitamente o motivo:

```tsx
{/* Lista estática, nunca reordenada — index como key aceitável aqui */}
{staticLabels.map((label, index) => (
  <span key={index}>{label}</span>
))}
```

### Referências

- [React Docs — Rendering Lists](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [React Docs — Why does React need keys?](https://react.dev/learn/rendering-lists#why-does-react-need-keys)
