import { FieldValue } from 'firebase-admin/firestore'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')

  const session = await auth()
  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  if (!state) {
    return NextResponse.json(
      { error: 'Parâmetro state ausente' },
      { status: 400 },
    )
  }

  try {
    const db = getFirestoreDb()
    const tokenDoc = await db.collection('telegramAuthTokens').doc(state).get()

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { error: 'Token inválido ou não encontrado' },
        { status: 400 },
      )
    }

    const tokenData = tokenDoc.data()!
    const expiresAt = new Date(tokenData.expiresAtMs)

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 })
    }

    const batch = db.batch()

    // Save link under user profile
    batch.set(
      db
        .collection('users')
        .doc(session.user.id)
        .collection('telegramLink')
        .doc('account'),
      {
        chatId: tokenData.chatId,
        username: '',
        linkedAt: FieldValue.serverTimestamp(),
      },
    )

    // Reverse-lookup for bot's is_already_linked check
    batch.set(db.collection('telegramLinks').doc(tokenData.chatId), {
      userId: session.user.id,
      linkedAt: FieldValue.serverTimestamp(),
    })

    // Delete consumed token
    batch.delete(db.collection('telegramAuthTokens').doc(state))

    await batch.commit()
  } catch (error) {
    console.error('Error in telegram callback:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 },
    )
  }

  redirect('/auth/telegram/success')
}
