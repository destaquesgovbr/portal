import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? ''

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!BOT_USERNAME) {
    return NextResponse.json(
      { error: 'Bot Telegram não configurado' },
      { status: 500 },
    )
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  try {
    const db = getFirestoreDb()
    await db.collection('telegramAuthTokens').doc(token).set({
      userId: session.user.id,
      expiresAtMs: expiresAt.getTime(),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar token' }, { status: 500 })
  }

  const url = `https://t.me/${BOT_USERNAME}?start=${token}`
  return NextResponse.json({ url })
}
