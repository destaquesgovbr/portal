import { NextResponse } from 'next/server'
import { getAgenciesList } from '@/data/agencies-utils'

export const revalidate = 3600

/**
 * GET /api/push/filters-data
 * Retorna lista de agências para filtros de push notifications
 */
export async function GET() {
  try {
    const agencies = await getAgenciesList()
    return NextResponse.json({ agencies })
  } catch (error) {
    console.error('Error fetching push filters data:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados de filtros' },
      { status: 500 },
    )
  }
}
