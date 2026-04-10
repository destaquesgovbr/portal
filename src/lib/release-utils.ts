import { getFirestoreDb } from '@/lib/firebase-admin'

export type ReleaseItem = {
  id: string
  clippingName: string
  articlesCount: number
  createdAt: string
  releaseUrl: string
  refTime?: string | null
  sinceHours?: number | null
  digestPreview?: string
}

export async function fetchReleasesForClipping(
  clippingId: string,
  clippingName: string,
  limit = 10,
): Promise<{ releases: ReleaseItem[]; hasMore: boolean }> {
  const db = getFirestoreDb()

  const snap = await db
    .collection('releases')
    .where('clippingId', '==', clippingId)
    .orderBy('createdAt', 'desc')
    .limit(limit + 1)
    .get()

  const hasMore = snap.docs.length > limit
  const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs

  const releases: ReleaseItem[] = docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      clippingName: d.clippingName ?? clippingName,
      articlesCount: d.articlesCount ?? 0,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
      releaseUrl: d.releaseUrl ?? `/clipping/release/${doc.id}`,
      refTime: d.refTime?.toDate?.()?.toISOString?.() ?? null,
      sinceHours: d.sinceHours ?? null,
      digestPreview: (() => {
        try {
          const parsed = JSON.parse(d.digest ?? '{}')
          return parsed.intro?.slice(0, 150) ?? ''
        } catch {
          return (d.digest ?? '').slice(0, 150)
        }
      })(),
    }
  })

  return { releases, hasMore }
}
