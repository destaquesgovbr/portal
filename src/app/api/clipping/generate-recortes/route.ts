import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

async function getWorkerHeaders(
  workerUrl: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const isLocal =
    workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1')

  if (!isLocal) {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(workerUrl)}&format=full`
    const tokenRes = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    })
    if (tokenRes.ok) {
      const token = await tokenRes.text()
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

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

  try {
    const headers = await getWorkerHeaders(workerUrl)
    const response = await fetch(
      `${workerUrl.replace(/\/$/, '')}/agent/generate-recortes`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt }),
      },
    )

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
  } catch (error) {
    console.error('Agent proxy error:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com o serviço de geração de recortes' },
      { status: 502 },
    )
  }
}
