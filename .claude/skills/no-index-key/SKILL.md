---
name: no-index-key
description: Regra para nunca utilizar índice do array como key em iterações .map() do React. Deve ser aplicada ao escrever, revisar ou refatorar componentes React que renderizam listas. Triggers em qualquer código que use .map() para renderizar JSX.
license: MIT
metadata:
  author: portal-team
  version: "1.0.0"
---

# Não use index como key em .map()

Regra de qualidade de código React que impede o uso do índice do array como prop `key` ao renderizar listas com `.map()`.

## Quando Aplicar

Referência esta regra quando:
- Escrever componentes React que renderizam listas com `.map()`
- Revisar código que itera sobre arrays para gerar JSX
- Refatorar componentes que usam `index` como `key`

## Categorias de Regras

| Prioridade | Categoria | Impacto | Prefixo |
|------------|----------|---------|---------|
| 1 | React Keys | HIGH | `react-` |

## Referência Rápida

### 1. React Keys (HIGH)

- `react-no-index-key` - Nunca use o índice do array como key em .map()

## Como Usar

Leia o arquivo de regra para explicação detalhada e exemplos de código:

```
rules/react-no-index-key.md
```

O arquivo contém:
- Explicação de por que isso importa
- Exemplos de código incorreto com explicação
- Exemplos de código correto com explicação
- Contexto adicional e referências
