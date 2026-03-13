import { GoogleAuth } from 'google-auth-library'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

type RouteParams = { params: Promise<{ id: string }> }

async function callWorker(userId: string, clippingId: string) {
  const workerUrl = process.env.CLIPPING_WORKER_URL
  if (!workerUrl) {
    throw new Error('CLIPPING_WORKER_URL not configured')
  }

  const url = `${workerUrl.replace(/\/$/, '')}/dispatch`
  const body = JSON.stringify({ user_id: userId, clipping_id: clippingId })

  const isLocal =
    workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (!isLocal) {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(workerUrl)}&format=full`
    const tokenRes = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    })
    if (!tokenRes.ok) {
      throw new Error(`Failed to get identity token: ${tokenRes.status}`)
    }
    const token = await tokenRes.text()
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { method: 'POST', headers, body })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Worker responded with ${response.status}: ${text}`)
  }

  return response.json()
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verify the clipping belongs to this user
    const db = getFirestoreDb()
    const doc = await db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .doc(id)
      .get()

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const result = await callWorker(session.user.id, id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error dispatching clipping:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar clipping' },
      { status: 502 },
    )
  }
}
