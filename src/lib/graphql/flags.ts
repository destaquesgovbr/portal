/**
 * Chaves das feature flags da migração GraphQL (módulo PURO — sem `'use client'`).
 *
 * Vive aqui (e não em `@/lib/feature-flags`, que é `'use client'`) para poder
 * ser importado tanto por código client quanto por Server Components. O wrapper
 * client re-exporta daqui para manter os imports existentes.
 */

export const GRAPHQL_FLAGS = {
  CLIPPINGS: 'graphql.clippings',
  MARKETPLACE: 'graphql.marketplace',
  AGENT: 'graphql.agent',
  PUSH: 'graphql.push',
  WIDGETS: 'graphql.widgets',
} as const

export type GraphQLFlagKey = (typeof GRAPHQL_FLAGS)[keyof typeof GRAPHQL_FLAGS]
