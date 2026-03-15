import { NextResponse } from 'next/server'
import { estimateTotalCount } from '@/lib/estimate-recorte-count'
import type { Recorte } from '@/types/clipping'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const recortesJson = searchParams.get('recortes')

    if (!recortesJson) {
      return NextResponse.json(
        { error: 'Missing recortes parameter' },
        { status: 400 },
      )
    }

    let recortes: Recorte[]
    try {
      recortes = JSON.parse(recortesJson)
    } catch {
      return NextResponse.json(
        { error: 'Invalid recortes JSON' },
        { status: 400 },
      )
    }

    if (!Array.isArray(recortes) || recortes.length === 0) {
      return NextResponse.json(
        { error: 'recortes must be a non-empty array' },
        { status: 400 },
      )
    }

    const result = await estimateTotalCount(recortes)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error estimating recorte count:', error)
    return NextResponse.json(
      { error: 'Erro ao estimar contagem' },
      { status: 500 },
    )
  }
}
