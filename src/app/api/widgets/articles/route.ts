import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryArticles } from '@/app/(public)/busca/actions'
import { WidgetArticlesResponseSchema } from '@/types/widget'

// Cache ISR de 5 minutos
export const revalidate = 300

const QueryParamsSchema = z.object({
  agencies: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : [])),
  themes: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : [])),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(1).max(50)),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(1)),
})

/**
 * GET /api/widgets/articles
 * Retorna artigos filtrados por agências e temas
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const params = QueryParamsSchema.safeParse({
      agencies: searchParams.get('agencies') ?? undefined,
      themes: searchParams.get('themes') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      page: searchParams.get('page') ?? undefined,
    })

    if (!params.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: params.error.issues },
        { status: 400 },
      )
    }

    const { agencies, themes, limit, page } = params.data

    // Buscar artigos usando a função existente
    // Converte page de 1-based para 0-based para Typesense
    const result = await queryArticles({
      page: page - 1,
      query: '',
      agencies: agencies.length > 0 ? agencies : undefined,
      themes: themes.length > 0 ? themes : undefined,
      // Sem filtro de data - sempre mostra recentes
      startDate: undefined,
      endDate: undefined,
    })

    // Limita os resultados ao limite especificado
    const articles = result.articles.slice(0, limit)
    const total = result.found
    const hasMore = page * limit < total

    // Monta resposta seguindo o schema
    const response = WidgetArticlesResponseSchema.parse({
      articles,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
      filters: {
        agencies,
        themes,
      },
    })

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error fetching widget articles:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar artigos' },
      { status: 500 },
    )
  }
}

/**
 * OPTIONS /api/widgets/articles
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
