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
import { normalizeEmail } from '@/lib/normalize-email'

const MAX_CLIPPINGS = 10

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('clippings')
      .where('authorUserId', '==', session.user.id)
      .orderBy('createdAt', 'desc')
      .get()

    const subscriptionsSnap = await db
      .collection('subscriptions')
      .where('userId', '==', session.user.id)
      .where('role', '==', 'author')
      .get()

    const subscriptionsByClipping = new Map<
      string,
      FirebaseFirestore.DocumentData
    >()
    for (const doc of subscriptionsSnap.docs) {
      const data = doc.data()
      subscriptionsByClipping.set(data.clippingId, {
        subscriptionId: doc.id,
        deliveryChannels: data.deliveryChannels,
        extraEmails: data.extraEmails,
        webhookUrl: data.webhookUrl,
      })
    }

    const clippings = snapshot.docs.map((doc) => {
      const data = doc.data()
      const sub = subscriptionsByClipping.get(doc.id)
      return {
        id: doc.id,
        ...data,
        ...(sub
          ? {
              subscriptionId: sub.subscriptionId,
              deliveryChannels: sub.deliveryChannels,
              extraEmails: sub.extraEmails,
              webhookUrl: sub.webhookUrl,
            }
          : {}),
      }
    })
    return NextResponse.json(clippings)
  } catch (error) {
    console.error('Error reading clippings:', error)
    return NextResponse.json(
      { error: 'Erro ao ler clippings' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = ClippingPayloadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const db = getFirestoreDb()
    const clippingsRef = db.collection('clippings')

    const countSnapshot = await clippingsRef
      .where('authorUserId', '==', session.user.id)
      .count()
      .get()
    const count = countSnapshot.data().count

    if (count >= MAX_CLIPPINGS) {
      return NextResponse.json(
        { error: `Limite máximo de ${MAX_CLIPPINGS} clippings atingido` },
        { status: 400 },
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

    const userRef = db.collection('users').doc(session.user.id)
    const clippingRef = clippingsRef.doc()
    const subscriptionRef = db.collection('subscriptions').doc()

    const batch = db.batch()
    batch.set(
      userRef,
      { email: normalizeEmail(session.user.email ?? '') },
      { merge: true },
    )
    batch.set(clippingRef, {
      ...clippingFields,
      authorUserId: session.user.id,
      nextRunAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    batch.set(subscriptionRef, {
      clippingId: clippingRef.id,
      userId: session.user.id,
      role: 'author',
      deliveryChannels,
      extraEmails,
      webhookUrl,
      subscribedAt: FieldValue.serverTimestamp(),
      active: true,
    })
    await batch.commit()

    // Fire-and-forget: first dispatch (catchup — don't make the user wait)
    const { callClippingWorker } = await import('@/lib/clipping-worker')
    callClippingWorker('/dispatch', {
      user_id: session.user.id,
      clipping_id: clippingRef.id,
    }).catch((err) =>
      console.error('Catchup dispatch failed (non-blocking):', err),
    )

    return NextResponse.json(
      {
        id: clippingRef.id,
        subscriptionId: subscriptionRef.id,
        ...payload,
        nextRunAt,
        catchupDispatched: true,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao criar clipping' },
      { status: 500 },
    )
  }
}
