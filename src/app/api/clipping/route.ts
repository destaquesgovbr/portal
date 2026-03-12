import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ClippingPayloadSchema } from '@/lib/clipping-validation'
import { getFirestoreDb } from '@/lib/firebase-admin'

const MAX_CLIPPINGS = 10

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .orderBy('createdAt', 'desc')
      .get()

    const clippings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
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

    const payload = result.data
    const docRef = await clippingsRef.add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id: docRef.id, ...payload }, { status: 201 })
  } catch (error) {
    console.error('Error creating clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao criar clipping' },
      { status: 500 },
    )
  }
}
