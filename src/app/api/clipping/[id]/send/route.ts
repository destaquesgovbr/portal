import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { callClippingWorker } from '@/lib/clipping-worker'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { normalizeEmail } from '@/lib/normalize-email'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verify the clipping exists and belongs to this user (top-level collection)
    const db = getFirestoreDb()
    const doc = await db.collection('clippings').doc(id).get()

    if (!doc.exists || doc.data()?.authorUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    // Ensure user document has email (for existing users created before this field)
    if (session.user.email) {
      await db
        .collection('users')
        .doc(session.user.id)
        .set({ email: normalizeEmail(session.user.email) }, { merge: true })
    }

    const result = await callClippingWorker('/dispatch', {
      user_id: session.user.id,
      clipping_id: id,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error dispatching clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar clipping' },
      { status: 502 },
    )
  }
}
