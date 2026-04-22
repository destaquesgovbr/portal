---
name: portal-implementation
description: Fluxo de trabalho para implementações no portal. Use esta skill quando o usuário pedir para implementar, adicionar, criar ou corrigir algo no projeto portal. Aciona em pedidos como "implementa", "adiciona", "cria uma feature", "corrige o bug", "muda o componente", "desenvolve", "faz a tela de", ou qualquer tarefa de desenvolvimento no repositório portal.
version: 1.0.0
---

# Portal — Fluxo de Implementação

Sempre que o usuário solicitar uma implementação no portal, siga estas etapas na ordem indicada.

## 1. Verificar e criar branch

Antes de qualquer alteração de código:

1. Verifique a branch atual com `git branch --show-current`.
2. Se estiver em `development` (ou `main`), crie uma branch descritiva para a tarefa:
   ```
   git checkout -b feature/<nome-curto-descritivo>
   ```
   Use os prefixos do projeto:
   - `feature/` — nova funcionalidade
   - `fix/` — correção de bug
   - `refactor/` — refatoração sem mudança de comportamento
   - `chore/` — tarefas de manutenção (deps, config, etc.)

3. Se já estiver em uma branch de trabalho (não `development`/`main`), continue nela sem criar outra.

## 2. Analisar componentes existentes antes de criar novos

Quando a implementação envolver interface ou componentes:

1. **Antes de criar qualquer arquivo novo**, use Grep e Glob para buscar componentes relacionados em `src/components/` e `src/app/`.
2. Verifique se já existe:
   - Um componente shadcn/ui (`src/components/ui/`) que atenda à necessidade.
   - Um componente de negócio (`src/components/`) reutilizável.
   - Um padrão de layout já usado em outra página do `src/app/(public)/`.
3. Prefira **editar** um componente existente a criar um novo.
4. Só crie um novo componente se não houver nenhum adequado — e justifique brevemente.

## 3. Implementar seguindo as convenções do projeto

- **Server Components** por padrão nas páginas; use `'use client'` apenas quando necessário (interatividade, hooks de estado/efeito).
- **Padrão `Result<T>`** para todas as server actions em `actions.ts`.
- **Tipagem** com os tipos de `src/types/` (ex.: `ArticleRow`).
- **Estilos** via Tailwind CSS 4; cores institucionais definidas em `globals.css` (`--government-blue`, `--government-red`, etc.).
- **Imports** na ordem: React/Next → libs externas → componentes internos → utilitários/tipos.
- **Nomes**: componentes em PascalCase, utilitários em camelCase, classes CSS em kebab-case.

## 4. Finalizar com oferta de commit e PR

Após concluir a implementação, **sempre** perguntar ao usuário:

> Implementação concluída. Deseja que eu faça o commit e abra um Pull Request para a branch `development`?

Se o usuário confirmar:

1. Rode `pnpm lint` e corrija eventuais erros antes de commitar.
2. Faça o commit seguindo a convenção do projeto:
   ```
   <prefixo>: <descrição concisa em português>

   - <detalhe 1>
   - <detalhe 2>
   ```
   Prefixos: `feature:`, `fix:`, `refactor:`, `docs:`, `chore:`.
   **Nunca incluir** `Co-Authored-By` na mensagem.
3. Faça push da branch: `git push -u origin <branch>`.
4. Abra o PR com `gh pr create` apontando para `development`, com título e descrição resumindo o que foi implementado.
