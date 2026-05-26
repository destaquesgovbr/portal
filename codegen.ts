/**
 * Configuração do GraphQL Code Generator.
 *
 * Gera types TypeScript a partir do schema GraphQL exposto pelo `graphql-api`
 * (Strawberry/Python). Os types ficam em `src/lib/graphql/__generated__/`
 * e são importados pelas queries em `src/lib/graphql/queries/` (B2-B5).
 *
 * O schema pode vir de:
 *   - URL remota (default — `NEXT_PUBLIC_GRAPHQL_URL`); ou
 *   - Arquivo local (`src/lib/graphql/schema.graphql`) para CI/dev offline.
 *
 * Uso: `pnpm graphql:codegen` (ou `pnpm graphql:codegen --watch`).
 */

import type { CodegenConfig } from '@graphql-codegen/cli'

const schemaUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL
const localSchemaPath = './src/lib/graphql/schema.graphql'

const config: CodegenConfig = {
  // Prefere schema remoto (introspection); cai para o arquivo local quando
  // a URL não está definida (CI build sem graphql-api rodando).
  schema: schemaUrl ?? localSchemaPath,
  documents: ['src/lib/graphql/queries/**/*.graphql'],
  ignoreNoDocuments: true,
  generates: {
    'src/lib/graphql/__generated__/types.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        // Mantém naming idiomático em TypeScript
        avoidOptionals: false,
        skipTypename: false,
      },
    },
  },
}

export default config
