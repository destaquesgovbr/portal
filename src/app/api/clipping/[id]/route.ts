import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ClippingPayloadSchema } from '@/lib/clipping-validation'
import { calculateNextRun } from '@/lib/cron-utils'
import {
  estimateTotalCount,
  MAX_DAILY_ARTICLES,
} from '@/lib/estimate-recorte-count'
import { getFirestoreDb } from '@/lib/firebase-admin'

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const result = ClippingPayloadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const db = getFirestoreDb()
    const docRef = db.collection('clippings').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const existingData = doc.data() ?? {}

    if (existingData.authorUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const estimation = await estimateTotalCount(result.data.recortes)
    if (estimation.total > MAX_DAILY_ARTICLES) {
      return NextResponse.json(
        {
          error: `Recortes retornam ~${estimation.total} notícias/dia. Limite: ${MAX_DAILY_ARTICLES}`,
        },
        { status: 400 },
      )
    }

    const payload = result.data
    const nextRunAt =
      calculateNextRun(
        payload.schedule,
        new Date(),
        payload.startDate ? new Date(payload.startDate) : undefined,
        payload.endDate ? new Date(payload.endDate) : undefined,
      ) ?? null

    const { deliveryChannels, extraEmails, webhookUrl, ...clippingFields } =
      payload

    const batch = db.batch()
    batch.update(docRef, {
      ...clippingFields,
      nextRunAt,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Update the author's subscription with delivery channel info
    const subsSnap = await db
      .collection('subscriptions')
      .where('clippingId', '==', id)
      .where('userId', '==', session.user.id)
      .where('role', '==', 'author')
      .limit(1)
      .get()

    if (!subsSnap.empty) {
      const subRef = subsSnap.docs[0].ref
      batch.update(subRef, {
        deliveryChannels,
        extraEmails,
        webhookUrl,
      })
    }

    if (
      existingData.publishedToMarketplace &&
      existingData.marketplaceListingId
    ) {
      const listingRef = db
        .collection('marketplace')
        .doc(existingData.marketplaceListingId)
      batch.update(listingRef, {
        name: clippingFields.name,
        description: clippingFields.description ?? '',
        recortes: clippingFields.recortes,
        prompt: clippingFields.prompt,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    return NextResponse.json({ id, ...payload, nextRunAt })
  } catch (error) {
    console.error('Error updating clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar clipping' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const db = getFirestoreDb()
    const docRef = db.collection('clippings').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const existingData = doc.data() ?? {}

    if (existingData.authorUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const batch = db.batch()

    if (
      existingData.publishedToMarketplace &&
      existingData.marketplaceListingId
    ) {
      const listingId = existingData.marketplaceListingId

      const listingRef = db.collection('marketplace').doc(listingId)
      batch.update(listingRef, { active: false })

      batch.update(docRef, { publishedToMarketplace: false })
    }

    // Delete the author's subscription
    const subsSnap = await db
      .collection('subscriptions')
      .where('clippingId', '==', id)
      .where('role', '==', 'author')
      .limit(1)
      .get()

    if (!subsSnap.empty) {
      batch.delete(subsSnap.docs[0].ref)
    }

    batch.delete(docRef)
    await batch.commit()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar clipping' },
      { status: 500 },
    )
  }
}
