import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

const MAX_CLIPPINGS = 0 // 0 = sem limite

export async function POST(
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

    // Check clipping limit (top-level collection)
    const clippingsRef = db.collection('clippings')

    const countSnapshot = await clippingsRef
      .where('authorUserId', '==', session.user.id)
      .count()
      .get()
    const count = countSnapshot.data().count

    if (MAX_CLIPPINGS > 0 && count >= MAX_CLIPPINGS) {
      return NextResponse.json(
        { error: `Limite máximo de ${MAX_CLIPPINGS} clippings atingido` },
        { status: 400 },
      )
    }

    // Create clipping copy + author subscription
    const newClippingRef = clippingsRef.doc()
    const subscriptionRef = db.collection('subscriptions').doc()
    const batch = db.batch()

    batch.set(newClippingRef, {
      name: listingData.name,
      description: listingData.description ?? '',
      shortDescription: listingData.shortDescription ?? '',
      recortes: listingData.recortes ?? [],
      prompt: listingData.prompt ?? '',
      clonedFrom: listingId,
      authorUserId: session.user.id,
      active: false,
      schedule: '0 8 * * *',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batch.set(subscriptionRef, {
      clippingId: newClippingRef.id,
      userId: session.user.id,
      role: 'author',
      deliveryChannels: {
        email: false,
        telegram: false,
        push: false,
        webhook: false,
      },
      extraEmails: [],
      webhookUrl: '',
      subscribedAt: FieldValue.serverTimestamp(),
      active: true,
    })

    batch.update(listingRef, {
      cloneCount: FieldValue.increment(1),
    })

    await batch.commit()

    return NextResponse.json({ id: newClippingRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error cloning listing:', error)
    return NextResponse.json(
      { error: 'Erro ao clonar listing' },
      { status: 500 },
    )
  }
}
