import { NextResponse } from 'next/server'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { WidgetConfigResponseSchema } from '@/types/widget'

// Cache ISR de 1 hora (dados mudam raramente)
export const revalidate = 3600

/**
 * GET /api/widgets/config
 * Retorna listas de agências e temas disponíveis para filtros
 */
export async function GET() {
  try {
    // Buscar dados de agencies e themes
    const [agencies, themes] = await Promise.all([
      getAgenciesList(),
      getThemesWithHierarchy(),
    ])

    // Monta resposta seguindo o schema
    const response = WidgetConfigResponseSchema.parse({
      agencies,
      themes,
    })

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error fetching widget config:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 },
    )
  }
}

/**
 * OPTIONS /api/widgets/config
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
