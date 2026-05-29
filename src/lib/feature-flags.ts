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

import {
  type GrowthBook,
  GrowthBookContext,
} from '@growthbook/growthbook-react'
import { useContext } from 'react'
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
 * Implementação: lê o `growthbook` directamente do `GrowthBookContext`
 * via `useContext` (em vez de `useFeatureValue`, que THROWA "Missing or
 * invalid GrowthBookProvider" quando consumido fora do `<GBProvider>`).
 *
 * O `GrowthBookProvider` custom do portal renderiza children sem o
 * `<GBProvider>` ancestor durante a janela entre o initial render e o
 * `setGrowthbook(gb)` do `useEffect` async. Usar `useContext` evita
 * propagar essa exceção e fazer páginas autenticadas (clipping wizard,
 * marketplace, …) explodirem com "Application error".
 *
 * Trade-off conhecido: a leitura via `gb.getFeatureValue()` directa não
 * subscreve a re-renders quando o GrowthBook recebe novas features via
 * streaming. Para `GRAPHQL_FLAGS` (toggles operados manualmente, com
 * reload aceitável) isso é aceitável; para experimentos A/B "ao vivo",
 * usar os hooks específicos do `src/ab-testing/`.
 *
 * @example
 *   const useGraphQL = useFeatureFlag('graphql.clippings', false)
 *   if (useGraphQL) { ... } else { ... fallback REST ... }
 */
export function useFeatureFlag(key: string, defaultValue: boolean): boolean {
  // Lê o GrowthBook do contexto sem throwar quando o provider está ausente
  // ou ainda inicializando (estado intermediário do `GrowthBookProvider`).
  const { growthbook } = useContext(GrowthBookContext)

  if (!growthbook || !isGrowthBookConfigured()) {
    return defaultValue
  }

  try {
    const value = growthbook.getFeatureValue<boolean>(key, defaultValue)
    if (typeof value !== 'boolean') {
      return defaultValue
    }
    return value
  } catch {
    // Falha graciosa: nunca quebra o portal por causa de uma flag.
    return defaultValue
  }
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
