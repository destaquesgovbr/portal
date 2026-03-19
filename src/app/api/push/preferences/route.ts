import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

/**
 * GET /api/push/preferences
 * Reads push notification preferences from Firestore for the authenticated user.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    const doc = await db
      .collection('users')
      .doc(session.user.id)
      .collection('pushPreferences')
      .doc('filters')
      .get()

    if (!doc.exists) {
      return NextResponse.json({ agencies: [] })
    }

    return NextResponse.json(doc.data())
  } catch (error) {
    console.error('Error reading push preferences:', error)
    return NextResponse.json(
      { error: 'Erro ao ler preferências' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/push/preferences
 * Saves push notification preferences to Firestore for the authenticated user.
 * Body: { agencies: string[] }
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const MAX_ITEMS = 200

  function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((v) => typeof v === 'string')
  }

  try {
    const body = await request.json()
    const { agencies = [] } = body

    if (!isStringArray(agencies)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    if (agencies.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: 'Limite de itens excedido' },
        { status: 400 },
      )
    }

    const db = getFirestoreDb()
    await db
      .collection('users')
      .doc(session.user.id)
      .collection('pushPreferences')
      .doc('filters')
      .set({ agencies, updatedAt: new Date().toISOString() }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving push preferences:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar preferências' },
      { status: 500 },
    )
  }
}
