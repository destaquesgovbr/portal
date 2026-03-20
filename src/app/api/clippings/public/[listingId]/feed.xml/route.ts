import { NextResponse } from 'next/server'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { generateMarketplaceFeed } from '@/lib/marketplace-feed'
import type { MarketplaceListing, Release } from '@/types/clipping'

type RouteParams = { params: Promise<{ listingId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { listingId } = await params
    const db = getFirestoreDb()

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

    const listing = {
      id: listingSnap.id,
      ...listingData,
    } as MarketplaceListing

    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', listing.sourceClippingId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const releases = releasesSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Release,
    )

    const feed = generateMarketplaceFeed(listing, releases)

    return new NextResponse(feed.rss2(), {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[feed.xml] Erro ao gerar feed:', error)
    return NextResponse.json({ error: 'Erro ao gerar o feed' }, { status: 500 })
  }
}
