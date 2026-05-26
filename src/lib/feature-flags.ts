/**
 * Feature flags wrapper.
 *
 * Camada fina sobre o GrowthBook configurado em `src/ab-testing/`.
 * Padroniza a leitura de flags com **default explícito** (fail-safe) e
 * concentra a lista de flags previstas para a migração GraphQL.
 *
 * Para uso server-side, `getFeatureFlag` aceita um GrowthBook instance
 * já avaliado (criado via `createGrowthBookInstance()` + `loadFeatures()`).
 * Se não houver instance, retorna `defaultValue`.
 */

'use client'

import type { GrowthBook } from '@growthbook/growthbook-react'
import { useFeatureValue } from '@growthbook/growthbook-react'
import { isGrowthBookConfigured } from '@/ab-testing/growthbook'

/**
 * Flags planejadas para a migração GraphQL (PLANO-ATUALIZACAO-v2, §3 D4).
 *
 * Default = `false` em todas: portal continua usando REST até a flag ser
 * explicitamente ligada via GrowthBook.
 */
export const GRAPHQL_FLAGS = {
  CLIPPINGS: 'graphql.clippings',
  MARKETPLACE: 'graphql.marketplace',
  AGENT: 'graphql.agent',
  PUSH: 'graphql.push',
  WIDGETS: 'graphql.widgets',
} as const

export type GraphQLFlagKey = (typeof GRAPHQL_FLAGS)[keyof typeof GRAPHQL_FLAGS]

/**
 * Hook client-side para ler uma feature flag com default explícito.
 *
 * Diferenças vs `useFeatureFlag(key)` do `src/ab-testing/`:
 *   - Aceita `defaultValue` (em vez de assumir `false`).
 *   - Se GrowthBook não estiver configurado **ou** falhar, retorna `defaultValue`.
 *   - Wrapper estável para uso na migração GraphQL (B2-B5).
 *
 * @example
 *   const useGraphQL = useFeatureFlag('graphql.clippings', false)
 *   if (useGraphQL) { ... } else { ... fallback REST ... }
 */
export function useFeatureFlag(key: string, defaultValue: boolean): boolean {
  // Chama o hook do GrowthBook incondicionalmente (regras de hooks)
  const value = useFeatureValue<boolean>(key, defaultValue)

  if (!isGrowthBookConfigured()) {
    return defaultValue
  }

  // GrowthBook pode retornar undefined/null se a flag não existir
  if (typeof value !== 'boolean') {
    return defaultValue
  }

  return value
}

/**
 * Leitura server-side de uma feature flag.
 *
 * Recebe uma instância de GrowthBook (criada por `createGrowthBookInstance()`
 * + `gb.loadFeatures()`). Se a instance for `null`/`undefined`, retorna o default.
 *
 * Uso típico em Server Components:
 *   const gb = createGrowthBookInstance()
 *   await gb.loadFeatures()
 *   gb.setAttributes({ id: userId })
 *   const useGraphQL = getFeatureFlag(GRAPHQL_FLAGS.CLIPPINGS, false, gb)
 *
 * @param key Chave da flag no GrowthBook.
 * @param defaultValue Valor de fallback.
 * @param gb Instância de GrowthBook (opcional).
 */
export function getFeatureFlag(
  key: string,
  defaultValue: boolean,
  gb?: GrowthBook | null,
): boolean {
  if (!gb) {
    return defaultValue
  }

  if (!isGrowthBookConfigured()) {
    return defaultValue
  }

  try {
    const value = gb.getFeatureValue<boolean>(key, defaultValue)
    if (typeof value !== 'boolean') {
      return defaultValue
    }
    return value
  } catch {
    // Falha graciosa: nunca quebra o portal por causa de uma flag
    return defaultValue
  }
}
