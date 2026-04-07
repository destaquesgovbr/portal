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

    const {
      clippingId,
      description: submittedDescription,
      backfillCount,
    } = result.data
    const db = getFirestoreDb()

    const clippingRef = db.collection('clippings').doc(clippingId)
    const clippingSnap = await clippingRef.get()

    if (
      !clippingSnap.exists ||
      clippingSnap.data()?.authorUserId !== session.user.id
    ) {
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

    const description = submittedDescription.trim()

    const recortes = clippingData.recortes
    if (!recortes || !Array.isArray(recortes) || recortes.length === 0) {
      return NextResponse.json(
        { error: 'Clipping precisa ter ao menos um recorte' },
        { status: 400 },
      )
    }

    const missingTitle = recortes.some(
      (r: { title?: string }) => !r.title || !r.title.trim(),
    )
    if (missingTitle) {
      return NextResponse.json(
        { error: 'Todos os recortes precisam ter um título para publicar' },
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
      schedule: clippingData.schedule || '',
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

    // Fire-and-forget: publish Pub/Sub message for cover image generation
    const { publishMarketplaceEvent } = await import('@/lib/pubsub')
    publishMarketplaceEvent(listingRef.id, 'published')

    // Fire-and-forget: backfill past releases for subscribers
    if (backfillCount && backfillCount > 0) {
      const { callClippingWorker } = await import('@/lib/clipping-worker')
      callClippingWorker('/dispatch/backfill', {
        user_id: session.user.id,
        clipping_id: clippingId,
        count: backfillCount,
      }).catch((err) =>
        console.error('Backfill dispatch failed (non-blocking):', err),
      )
    }

    return NextResponse.json({ listingId: listingRef.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error publishing to marketplace:', message, error)
    return NextResponse.json(
      { error: `Erro ao publicar no marketplace: ${message}` },
      { status: 500 },
    )
  }
}
