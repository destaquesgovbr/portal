import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

const MAX_CLIPPINGS = 10

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

    // Check clipping limit
    const clippingsRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')

    const countSnapshot = await clippingsRef.count().get()
    const count = countSnapshot.data().count

    if (count >= MAX_CLIPPINGS) {
      return NextResponse.json(
        { error: `Limite máximo de ${MAX_CLIPPINGS} clippings atingido` },
        { status: 400 },
      )
    }

    // Create clipping copy
    const newClippingRef = clippingsRef.doc()
    const batch = db.batch()

    batch.set(newClippingRef, {
      name: listingData.name,
      description: listingData.description ?? '',
      recortes: listingData.recortes ?? [],
      prompt: listingData.prompt ?? '',
      clonedFrom: listingId,
      active: false,
      schedule: '0 8 * * *',
      deliveryChannels: { email: false, telegram: false, push: false },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
