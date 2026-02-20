import { type NextRequest, NextResponse } from 'next/server'
import {
  buildFeed,
  computeETag,
  type FeedFormat,
  feedContentType,
  parseFeedParams,
  serializeFeed,
  validateFeedParams,
} from '@/lib/feed'

/**
 * Handler compartilhado para os 3 route handlers de feed (XML, Atom, JSON).
 * Centraliza: parsing, validação, geração, ETag, caching.
 */
export async function handleFeedRequest(
  request: NextRequest,
  format: FeedFormat,
): Promise<NextResponse> {
  try {
    const params = parseFeedParams(request.nextUrl.searchParams)

    const validationError = await validateFeedParams(params)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.message, field: validationError.field },
        { status: 400 },
      )
    }

    const feed = await buildFeed(params)
    const body = serializeFeed(feed, format)
    const etag = computeETag(body)

    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 })
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': feedContentType(format),
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        ETag: etag,
      },
    })
  } catch (error) {
    console.error(`[feed.${format}] Erro ao gerar feed:`, error)
    return NextResponse.json({ error: 'Erro ao gerar o feed' }, { status: 500 })
  }
}
