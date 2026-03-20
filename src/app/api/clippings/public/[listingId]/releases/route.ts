import { type NextRequest, NextResponse } from 'next/server'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { Release } from '@/types/clipping'

type RouteParams = { params: Promise<{ listingId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params
    const db = getFirestoreDb()

    // Fetch listing
    const listingSnap = await db.collection('marketplace').doc(listingId).get()

    if (!listingSnap.exists) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    const listingData = listingSnap.data()!

    if (!listingData.active) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    // Parse pagination params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit')) || 10),
    )
    const offset = (page - 1) * limit

    // Query releases
    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', listingData.sourceClippingId)
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit + 1) // Fetch one extra to detect hasMore
      .get()

    const docs = releasesSnap.docs
    const hasMore = docs.length > limit
    const releaseDocs = hasMore ? docs.slice(0, limit) : docs

    const releases: Release[] = releaseDocs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        clippingId: data.clippingId,
        userId: data.userId,
        clippingName: data.clippingName,
        digest: data.digest,
        digestHtml: data.digestHtml,
        articlesCount: data.articlesCount,
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        releaseUrl: data.releaseUrl,
      }
    })

    return NextResponse.json({ releases, hasMore })
  } catch (error) {
    console.error('Error fetching releases:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar edições' },
      { status: 500 },
    )
  }
}
