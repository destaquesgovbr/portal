/**
 * Resolução de feature flags `graphql.*` no SERVIDOR (Server Components).
 *
 * O wrapper client (`@/lib/feature-flags`) é `'use client'` e não pode ser
 * chamado em Server Components. Aqui criamos uma instância GrowthBook por
 * request, carregamos as features e avaliamos a flag com o id do usuário —
 * permitindo que o SSR hidrate dados via a fachada GraphQL quando a flag está
 * ON (em vez de ler o Firestore direto, que ignora o estado da flag).
 *
 * Falha graciosa: qualquer erro → `false` (mantém o caminho legado/Firestore).
 *
 * Obs.: não usa `import 'server-only'` para permanecer importável pelos testes
 * (vitest) que exercitam o `getClippings` da página; é usado apenas por Server
 * Components e os boundaries RSC são validados pelo `next build`.
 */

import {
  createGrowthBookInstance,
  isGrowthBookConfigured,
} from '@/ab-testing/growthbook'

export { GRAPHQL_FLAGS } from '@/lib/graphql/flags'

export async function resolveGraphQLFlagServer(
  flagKey: string,
  userId?: string | null,
): Promise<boolean> {
  if (!isGrowthBookConfigured()) return false
  try {
    const gb = createGrowthBookInstance()
    if (userId) gb.setAttributes({ id: userId })
    await gb.init({ timeout: 2000 })
    const value = gb.getFeatureValue<boolean>(flagKey, false)
    gb.destroy()
    return typeof value === 'boolean' ? value : false
  } catch {
    return false
  }
}
