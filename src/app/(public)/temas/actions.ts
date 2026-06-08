'use server'

import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'

/** Cliente GraphQL público (sem token) para as server actions de temas. */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

/**
 * Get article counts by theme code for the last 30 days
 * Returns a Map of theme code → count
 * Each level is counted separately (level 1, 2, and 3)
 */
export async function getThemeArticleCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  try {
    const svc = content()

    // Conta cada nível separadamente (1, 2 e 3), janela de 30 dias.
    const [level1, level2, level3] = await Promise.all([
      svc.getThemeArticleCounts(30, 1),
      svc.getThemeArticleCounts(30, 2),
      svc.getThemeArticleCounts(30, 3),
    ])

    for (const level of [level1, level2, level3]) {
      for (const { code, count } of level) {
        if (code && code !== 'null' && code !== '') {
          counts.set(code, count)
        }
      }
    }

    return counts
  } catch (error) {
    console.error('Error fetching theme article counts:', error)
    return counts
  }
}
