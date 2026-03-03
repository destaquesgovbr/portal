import type { NextRequest } from 'next/server'
import { handleFeedRequest } from '@/lib/feed-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleFeedRequest(request, 'json')
}
