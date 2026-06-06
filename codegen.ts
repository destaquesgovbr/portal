/**
 * Configuração do GraphQL Code Generator.
 *
 * Função dupla:
 *   1. **Gate anti-drift (principal):** valida TODAS as operações `gql\`...\``
 *      do portal contra o schema do `graphql-api`. Se uma operação selecionar
 *      um campo/argumento que o schema não expõe, o codegen FALHA — foi
 *      exatamente o drift (`iteration`) que passou despercebido por este gate
 *      estar quebrado: o glob antigo apontava para `*.graphql`, que não casa
 *      nenhum arquivo (as ops vivem em `*.ts`), então o codegen rodava vazio.
 *   2. Gera types em `src/lib/graphql/__generated__/` (gitignored; artefato de
 *      validação, não commitado nem importado por ora).
 *
 * Schema: snapshot commitado `src/lib/graphql/schema.graphql` (determinístico,
 * offline em CI). Mantê-lo em sincronia com o `graphql-api`: rodar
 * `make docs-schema` lá e copiar `docs/reference/schema.graphql` para cá.
 * Override opcional via `GRAPHQL_SCHEMA_URL` (introspecção de um serviço vivo).
 *
 * Uso: `pnpm graphql:codegen`.
 */

import type { CodegenConfig } from '@graphql-codegen/cli'

const schemaSource =
  process.env.GRAPHQL_SCHEMA_URL ?? './src/lib/graphql/schema.graphql'

const config: CodegenConfig = {
  schema: schemaSource,
  // As operações são `gql\`...\`` em arquivos .ts (queries + services).
  documents: ['src/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    // Apenas `typescript` + `typescript-operations`: bastam para validar as
    // operações contra o schema (falham em campo/argumento inexistente). Não
    // usamos `typed-document-node` — os tipos não são adotados (gate-only), e
    // ele exigiria o peer-dep `@graphql-typed-document-node/core`.
    'src/lib/graphql/__generated__/types.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        useTypeImports: true,
        avoidOptionals: false,
        skipTypename: false,
      },
    },
  },
}

export default config
