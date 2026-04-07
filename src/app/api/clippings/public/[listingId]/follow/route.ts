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

    const { deliveryChannels, extraEmails, webhookUrl } = result.data

    // At least one delivery channel must be selected
    if (
      !deliveryChannels.email &&
      !deliveryChannels.telegram &&
      !deliveryChannels.push &&
      !deliveryChannels.webhook
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

    // Check if already following via subscriptions collection
    const existingSnap = await db
      .collection('subscriptions')
      .where('clippingId', '==', listingData.sourceClippingId)
      .where('userId', '==', session.user.id)
      .where('role', '==', 'subscriber')
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'Você já segue este listing' },
        { status: 409 },
      )
    }

    // Create subscription + increment followerCount atomically
    const subscriptionRef = db.collection('subscriptions').doc()
    const batch = db.batch()

    batch.set(subscriptionRef, {
      clippingId: listingData.sourceClippingId,
      userId: session.user.id,
      role: 'subscriber',
      deliveryChannels,
      extraEmails,
      webhookUrl,
      subscribedAt: FieldValue.serverTimestamp(),
      active: true,
    })

    batch.update(listingRef, {
      followerCount: FieldValue.increment(1),
    })

    await batch.commit()

    return NextResponse.json(
      { ok: true, subscriptionId: subscriptionRef.id },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error following listing:', error)
    return NextResponse.json(
      { error: 'Erro ao seguir listing' },
      { status: 500 },
    )
  }
}

export async function PUT(
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

    const { deliveryChannels, extraEmails, webhookUrl } = result.data

    if (
      !deliveryChannels.email &&
      !deliveryChannels.telegram &&
      !deliveryChannels.push &&
      !deliveryChannels.webhook
    ) {
      return NextResponse.json(
        { error: 'Selecione ao menos um canal de entrega' },
        { status: 400 },
      )
    }

    const { listingId } = await params
    const db = getFirestoreDb()

    // Get the listing to find the sourceClippingId
    const listingSnap = await db.collection('marketplace').doc(listingId).get()

    if (!listingSnap.exists) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    const listingData = listingSnap.data()!

    // Find the subscription
    const subsSnap = await db
      .collection('subscriptions')
      .where('clippingId', '==', listingData.sourceClippingId)
      .where('userId', '==', session.user.id)
      .where('role', '==', 'subscriber')
      .limit(1)
      .get()

    if (subsSnap.empty) {
      return NextResponse.json(
        { error: 'Você não segue este listing' },
        { status: 404 },
      )
    }

    await subsSnap.docs[0].ref.update({
      deliveryChannels,
      extraEmails,
      webhookUrl,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating follow:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
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
    const listingSnap = await listingRef.get()

    // Find the subscription via the listing's sourceClippingId
    let sourceClippingId: string | undefined
    if (listingSnap.exists) {
      const listingData = listingSnap.data()!
      sourceClippingId = listingData.sourceClippingId
    }

    // Try to find subscription by clippingId if we know it, otherwise search broadly
    let subsSnap: FirebaseFirestore.QuerySnapshot
    if (sourceClippingId) {
      subsSnap = await db
        .collection('subscriptions')
        .where('clippingId', '==', sourceClippingId)
        .where('userId', '==', session.user.id)
        .where('role', '==', 'subscriber')
        .limit(1)
        .get()
    } else {
      // Listing deleted — cannot determine subscription
      return NextResponse.json(
        { error: 'Você não segue este listing' },
        { status: 404 },
      )
    }

    if (subsSnap.empty) {
      return NextResponse.json(
        { error: 'Você não segue este listing' },
        { status: 404 },
      )
    }

    const batch = db.batch()

    batch.delete(subsSnap.docs[0].ref)

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
