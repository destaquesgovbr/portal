import { unstable_cache } from 'next/cache'
import { getAgenciesList } from '@/data/agencies-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { createSSRClient } from '@/lib/graphql/client'
import { getContentService } from '@/services/content'

export type LandingStats = {
  portalsCount: number
  newsCount: number
  publicClippingsCount: number
}

async function computeStats(): Promise<LandingStats> {
  // Conteúdo público não precisa de token de autenticação.
  const content = getContentService(createSSRClient(async () => null))

  const [agencies, newsResult, marketplaceSnap] = await Promise.all([
    getAgenciesList().catch(() => []),
    content.listArticles({ limit: 0 }).catch(() => ({ found: 0 })),
    getFirestoreDb()
      .collection('marketplace')
      .where('active', '==', true)
      .count()
      .get()
      .catch(() => null),
  ])

  return {
    portalsCount: agencies.length,
    newsCount: newsResult.found ?? 0,
    publicClippingsCount: marketplaceSnap?.data().count ?? 0,
  }
}

/**
 * Stats for the home landing page.
 * Cached for 24 hours — these numbers change slowly.
 */
export const getLandingStats = unstable_cache(computeStats, ['landing-stats'], {
  revalidate: 86_400,
  tags: ['landing-stats'],
})
