'use server'

import { getFirestoreDb } from '@/lib/firebase-admin'
import type { Recorte, Release } from '@/types/clipping'

export type ReleaseWithContext = Release & {
  recortes: Recorte[]
}

export async function getReleaseById(
  releaseId: string,
): Promise<ReleaseWithContext | null> {
  try {
    const db = getFirestoreDb()
    const doc = await db.collection('releases').doc(releaseId).get()

    if (!doc.exists) return null

    const data = doc.data()!

    // Fetch clipping data
    let recortes: Recorte[] = []
    let marketplaceListingId: string | null = null
    if (data.clippingId) {
      const clippingDoc = await db
        .collection('clippings')
        .doc(data.clippingId)
        .get()
      if (clippingDoc.exists) {
        const clippingData = clippingDoc.data()!
        recortes = clippingData.recortes ?? []
        if (
          clippingData.publishedToMarketplace &&
          clippingData.marketplaceListingId
        ) {
          marketplaceListingId = clippingData.marketplaceListingId
        }
      }
    }

    return {
      id: doc.id,
      clippingId: data.clippingId ?? '',
      userId: data.userId ?? '',
      clippingName: data.clippingName ?? '',
      digest: data.digest ?? '',
      digestHtml: data.digestHtml ?? '',
      articlesCount: data.articlesCount ?? 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? '',
      releaseUrl: data.releaseUrl ?? '',
      refTime: data.refTime?.toDate?.()?.toISOString?.() ?? null,
      sinceHours: data.sinceHours ?? null,
      recortes,
      marketplaceListingId,
    }
  } catch (error) {
    console.error('Error fetching release:', error)
    return null
  }
}
