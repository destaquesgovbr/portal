import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { FollowListingSchema } from '@/lib/clipping-validation'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = FollowListingSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const { deliveryChannels } = result.data

    // At least one delivery channel must be selected
    if (
      !deliveryChannels.email &&
      !deliveryChannels.telegram &&
      !deliveryChannels.push
    ) {
      return NextResponse.json(
        { error: 'Selecione ao menos um canal de entrega' },
        { status: 400 },
      )
    }

    const { listingId } = await params
    const db = getFirestoreDb()

    // Fetch the listing
    const listingRef = db.collection('marketplace').doc(listingId)
    const listingSnap = await listingRef.get()

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

    // Cannot follow your own listing
    if (listingData.authorUserId === session.user.id) {
      return NextResponse.json(
        { error: 'Não é possível seguir seu próprio clipping' },
        { status: 400 },
      )
    }

    // Check if already following via subcollection
    const followerRef = listingRef.collection('followers').doc(session.user.id)

    const existing = await followerRef.get()
    if (existing.exists) {
      return NextResponse.json(
        { error: 'Você já segue este listing' },
        { status: 409 },
      )
    }

    // Create follower doc + increment followerCount atomically
    const batch = db.batch()

    batch.set(followerRef, {
      userId: session.user.id,
      deliveryChannels,
      followedAt: FieldValue.serverTimestamp(),
    })

    batch.update(listingRef, {
      followerCount: FieldValue.increment(1),
    })

    await batch.commit()

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Error following listing:', error)
    return NextResponse.json(
      { error: 'Erro ao seguir listing' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { listingId } = await params
    const db = getFirestoreDb()

    const listingRef = db.collection('marketplace').doc(listingId)
    const followerRef = listingRef.collection('followers').doc(session.user.id)

    const followerSnap = await followerRef.get()
    if (!followerSnap.exists) {
      return NextResponse.json(
        { error: 'Você não segue este listing' },
        { status: 404 },
      )
    }

    const batch = db.batch()

    batch.delete(followerRef)
    batch.update(listingRef, {
      followerCount: FieldValue.increment(-1),
    })

    await batch.commit()

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Error unfollowing listing:', error)
    return NextResponse.json(
      { error: 'Erro ao deixar de seguir listing' },
      { status: 500 },
    )
  }
}
