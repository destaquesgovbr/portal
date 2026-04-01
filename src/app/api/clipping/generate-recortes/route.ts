import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const prompt = (body.prompt ?? '').trim()

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 })
  }

  const workerUrl = process.env.CLIPPING_WORKER_URL
  if (!workerUrl) {
    return NextResponse.json(
      { error: 'CLIPPING_WORKER_URL not configured' },
      { status: 500 },
    )
  }

  const response = await fetch(`${workerUrl}/agent/generate-recortes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error(`Agent worker error (${response.status}): ${detail}`)
    return NextResponse.json(
      { error: 'Erro ao gerar recortes', detail },
      { status: 502 },
    )
  }

  const data = await response.json()
  return NextResponse.json(data)
}
