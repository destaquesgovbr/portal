import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { FollowListingSchema } from '@/lib/clipping-validation'
import { getFirestoreDb } from '@/lib/firebase-admin'

const MAX_CLIPPINGS = 10

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

    const { scheduleTime, deliveryChannels } = result.data

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

    const clippingsRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')

    // Check if already following
    const existingFollow = await clippingsRef
      .where('followsListingId', '==', listingId)
      .limit(1)
      .get()

    if (!existingFollow.empty) {
      return NextResponse.json(
        { error: 'Você já segue este listing' },
        { status: 409 },
      )
    }

    // Check clipping limit
    const countSnapshot = await clippingsRef.count().get()
    const count = countSnapshot.data().count

    if (count >= MAX_CLIPPINGS) {
      return NextResponse.json(
        { error: `Limite máximo de ${MAX_CLIPPINGS} clippings atingido` },
        { status: 400 },
      )
    }

    // Create follower clipping + increment followerCount atomically
    const followerClippingRef = clippingsRef.doc()
    const batch = db.batch()

    batch.set(followerClippingRef, {
      followsListingId: listingId,
      followsAuthorUserId: listingData.authorUserId,
      scheduleTime,
      deliveryChannels,
      active: true,
      name: listingData.name,
      recortes: [],
      prompt: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batch.update(listingRef, {
      followerCount: FieldValue.increment(1),
    })

    await batch.commit()

    return NextResponse.json({ id: followerClippingRef.id }, { status: 201 })
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

    const clippingsRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')

    // Find the follower clipping
    const followSnap = await clippingsRef
      .where('followsListingId', '==', listingId)
      .limit(1)
      .get()

    if (followSnap.empty) {
      return NextResponse.json(
        { error: 'Você não segue este listing' },
        { status: 404 },
      )
    }

    const followerDoc = followSnap.docs[0]
    const batch = db.batch()

    batch.delete(followerDoc.ref)

    // Decrement followerCount only if listing still exists
    const listingRef = db.collection('marketplace').doc(listingId)
    const listingSnap = await listingRef.get()

    if (listingSnap.exists) {
      batch.update(listingRef, {
        followerCount: FieldValue.increment(-1),
      })
    }

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
