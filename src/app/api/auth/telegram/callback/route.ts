import { FieldValue, Timestamp } from 'firebase-admin/firestore'
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
    const expiresAt: Date =
      tokenData.expiresAt instanceof Timestamp
        ? tokenData.expiresAt.toDate()
        : tokenData.expiresAt.toDate()

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 })
    }

    await db
      .collection('users')
      .doc(session.user.id)
      .collection('telegramLink')
      .doc('account')
      .set({
        chatId: tokenData.chatId,
        username: '',
        linkedAt: FieldValue.serverTimestamp(),
      })

    await db.collection('telegramAuthTokens').doc(state).delete()

    redirect('/auth/telegram/success')
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Error in telegram callback:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 },
    )
  }
}
