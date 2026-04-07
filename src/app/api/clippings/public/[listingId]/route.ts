import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

type RouteParams = { params: Promise<{ listingId: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const data = listingSnap.data()!

    if (!data.active) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    const listing: Record<string, unknown> = {
      id: listingSnap.id,
      ...data,
    }

    // If user is authenticated, include personalized fields
    const session = await auth()
    if (session?.user?.id) {
      const userId = session.user.id

      const [likeSnap, followerSnap] = await Promise.all([
        db
          .collection('marketplace')
          .doc(listingId)
          .collection('likes')
          .doc(userId)
          .get(),
        db
          .collection('subscriptions')
          .where('clippingId', '==', listing.sourceClippingId)
          .where('userId', '==', userId)
          .where('role', '==', 'subscriber')
          .limit(1)
          .get(),
      ])

      listing.userHasLiked = likeSnap.exists
      listing.userFollows = !followerSnap.empty
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar listing' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { listingId } = await params
    const db = getFirestoreDb()

    const listingRef = db.collection('marketplace').doc(listingId)
    const listingSnap = await listingRef.get()

    if (!listingSnap.exists) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    const data = listingSnap.data()!

    if (data.authorUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para remover este listing' },
        { status: 403 },
      )
    }

    const batch = db.batch()

    // Deactivate the listing
    batch.update(listingRef, { active: false })

    // Update source clipping
    const sourceClippingRef = db
      .collection('users')
      .doc(data.authorUserId as string)
      .collection('clippings')
      .doc(data.sourceClippingId as string)

    batch.update(sourceClippingRef, {
      publishedToMarketplace: false,
      marketplaceListingId: null,
    })

    await batch.commit()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error unpublishing listing:', error)
    return NextResponse.json(
      { error: 'Erro ao remover listing' },
      { status: 500 },
    )
  }
}
