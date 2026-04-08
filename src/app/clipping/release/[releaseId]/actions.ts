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

    // Fetch clipping recortes
    let recortes: Recorte[] = []
    if (data.clippingId) {
      const clippingDoc = await db
        .collection('clippings')
        .doc(data.clippingId)
        .get()
      if (clippingDoc.exists) {
        recortes = clippingDoc.data()?.recortes ?? []
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
    }
  } catch (error) {
    console.error('Error fetching release:', error)
    return null
  }
}
