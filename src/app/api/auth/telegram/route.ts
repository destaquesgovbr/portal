import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')

  const session = await auth()
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(
      `/api/auth/telegram${state ? `?state=${state}` : ''}`,
    )
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`)
  }

  if (!state) {
    return NextResponse.json(
      { error: 'Parâmetro state ausente' },
      { status: 400 },
    )
  }

  let tokenValid = false

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

    tokenValid = true
  } catch (error) {
    console.error('Error in telegram auth:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 },
    )
  }

  if (tokenValid) {
    redirect(`/api/auth/telegram/callback?state=${state}`)
  }
}
