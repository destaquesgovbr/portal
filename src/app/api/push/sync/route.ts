import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

/**
 * POST /api/push/sync
 * Syncs an existing anonymous push subscription with the authenticated user.
 * Called when a user logs in and already has a push subscription.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!PUSH_WORKER_URL) {
    return NextResponse.json(
      { error: 'Push worker não configurado' },
      { status: 500 },
    )
  }

  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys) {
      return NextResponse.json(
        { error: 'endpoint e keys são obrigatórios' },
        { status: 400 },
      )
    }

    // Fetch saved preferences from Firestore to preserve existing filters when
    // associating the user_id. The worker uses DELETE+INSERT, so filters: []
    // would wipe all filters — we must send the current saved filters.
    const db = getFirestoreDb()
    const doc = await db
      .collection('users')
      .doc(session.user.id)
      .collection('pushPreferences')
      .doc('filters')
      .get()

    const prefs = doc.exists ? doc.data() : { agencies: [] }

    const filters = (prefs?.agencies ?? []).map((key: string) => ({
      type: 'agency',
      value: key,
    }))

    const response = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        keys,
        filters,
        user_id: session.user.id,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao sincronizar com worker' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Push sync error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
