import { NextResponse } from 'next/server'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesHierarchy } from '@/data/themes-utils'

export const revalidate = 3600

/**
 * GET /api/push/filters-data
 * Retorna hierarquia de temas e lista de agências para filtros de push notifications
 */
export async function GET() {
  try {
    const [themes, agencies] = await Promise.all([
      getThemesHierarchy(),
      getAgenciesList(),
    ])

    return NextResponse.json({ themes, agencies })
  } catch (error) {
    console.error('Error fetching push filters data:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados de filtros' },
      { status: 500 },
    )
  }
}
