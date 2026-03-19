'use server'

import { getFirestoreDb } from '@/lib/firebase-admin'
import type { Release } from '@/types/clipping'

export async function getReleaseById(
  releaseId: string,
): Promise<Release | null> {
  try {
    const db = getFirestoreDb()
    const doc = await db.collection('releases').doc(releaseId).get()

    if (!doc.exists) return null

    const data = doc.data()!
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
    }
  } catch (error) {
    console.error('Error fetching release:', error)
    return null
  }
}
