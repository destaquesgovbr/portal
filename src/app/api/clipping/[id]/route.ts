import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ClippingPayloadSchema } from '@/lib/clipping-validation'
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
    const docRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const payload = result.data
    await docRef.update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id, ...payload })
  } catch (error) {
    console.error('Error updating clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar clipping' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const db = getFirestoreDb()
    const docRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    await docRef.delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar clipping' },
      { status: 500 },
    )
  }
}
