import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PublishToMarketplaceSchema } from '@/lib/clipping-validation'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = PublishToMarketplaceSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const { clippingId, description, recortes } = result.data
    const db = getFirestoreDb()

    const clippingRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .doc(clippingId)

    const clippingSnap = await clippingRef.get()

    if (!clippingSnap.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const clippingData = clippingSnap.data()!

    if (clippingData.publishedToMarketplace) {
      return NextResponse.json(
        { error: 'Clipping já publicado no marketplace' },
        { status: 409 },
      )
    }

    if (clippingData.followsListingId) {
      return NextResponse.json(
        { error: 'Não é possível publicar um clipping que é um follow' },
        { status: 400 },
      )
    }

    const listingRef = db.collection('marketplace').doc()

    const batch = db.batch()
    batch.set(listingRef, {
      authorUserId: session.user.id,
      authorDisplayName: session.user.name ?? '',
      sourceClippingId: clippingId,
      name: clippingData.name,
      description,
      recortes,
      prompt: clippingData.prompt,
      likeCount: 0,
      followerCount: 0,
      cloneCount: 0,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      active: true,
    })
    batch.update(clippingRef, {
      publishedToMarketplace: true,
      marketplaceListingId: listingRef.id,
      description,
    })
    await batch.commit()

    return NextResponse.json({ listingId: listingRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error publishing to marketplace:', error)
    return NextResponse.json(
      { error: 'Erro ao publicar no marketplace' },
      { status: 500 },
    )
  }
}
