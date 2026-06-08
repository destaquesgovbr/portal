'use server'

import { createSSRClient } from '@/lib/graphql/client'
import { getContentService } from '@/services/content'
import type { ArticleRow } from '@/types/article'

export type GetArticlesArgs = {
  agency: string
  page: number
  startDate?: number
  endDate?: number
  themes?: string[]
}

export type GetArticlesResult = {
  articles: ArticleRow[]
  page: number
}

const PAGE_SIZE = 40

/** Cliente GraphQL público (sem token) para a server action do órgão. */
function content() {
  return getContentService(createSSRClient(async () => null))
}

export async function getArticles(
  args: GetArticlesArgs,
): Promise<GetArticlesResult> {
  const { agency, page, startDate, endDate, themes } = args

  // Datas: o filtro do facade usa strings ISO (DateTime do schema).
  // startDate/endDate chegam em ms; endDate é exclusivo do dia seguinte no
  // comportamento original (`< endDate + 1 dia`).
  const startIso = startDate ? new Date(startDate).toISOString() : null
  const endIso = endDate ? new Date(endDate + 86400000).toISOString() : null

  const result = await content().listArticles({
    page,
    limit: PAGE_SIZE,
    // Órgão não deduplica por content_hash (comportamento original sem group_by).
    dedup: false,
    filter: {
      agencies: [agency],
      // themes filtra por código, OR através de L1/L2/L3 (resolvido server-side).
      themes: themes && themes.length > 0 ? themes : null,
      startDate: startIso,
      endDate: endIso,
    },
  })

  return {
    articles: result.articles,
    page: page + 1,
  }
}
