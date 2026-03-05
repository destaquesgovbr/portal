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
      return NextResponse.json({ themes: [], agencies: [], keywords: [] })
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
 * Body: { themes: string[], agencies: string[], keywords: string[] }
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const MAX_ITEMS = 100
  const MAX_KEYWORD_LENGTH = 100

  function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((v) => typeof v === 'string')
  }

  try {
    const body = await request.json()
    const { themes = [], agencies = [], keywords = [] } = body

    if (
      !isStringArray(themes) ||
      !isStringArray(agencies) ||
      !isStringArray(keywords)
    ) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    if (
      themes.length > MAX_ITEMS ||
      agencies.length > MAX_ITEMS ||
      keywords.length > MAX_ITEMS
    ) {
      return NextResponse.json(
        { error: 'Limite de itens excedido' },
        { status: 400 },
      )
    }

    if (keywords.some((kw) => kw.length > MAX_KEYWORD_LENGTH)) {
      return NextResponse.json(
        { error: 'Palavra-chave muito longa' },
        { status: 400 },
      )
    }

    const db = getFirestoreDb()
    await db
      .collection('users')
      .doc(session.user.id)
      .collection('pushPreferences')
      .doc('filters')
      .set(
        { themes, agencies, keywords, updatedAt: new Date().toISOString() },
        { merge: true },
      )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving push preferences:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar preferências' },
      { status: 500 },
    )
  }
}
