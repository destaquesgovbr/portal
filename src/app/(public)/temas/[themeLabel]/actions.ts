'use server'

import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { ArticleRow } from '@/types/article'

export type GetArticlesArgs = {
  theme_1_level_1: string
  page: number
  startDate?: number
  endDate?: number
  agencies?: string[]
}

export type GetArticlesResult = {
  articles: ArticleRow[]
  page: number
}

const PAGE_SIZE = 40

/** Cliente GraphQL público (sem token) para a server action do tema. */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

export async function getArticles(
  args: GetArticlesArgs,
): Promise<GetArticlesResult> {
  const { theme_1_level_1, page, startDate, endDate, agencies } = args

  // Datas: o filtro do facade usa strings ISO (DateTime do schema).
  // startDate/endDate chegam em ms; endDate é exclusivo do dia seguinte no
  // comportamento original (`< endDate + 1 dia`).
  const startIso = startDate ? new Date(startDate).toISOString() : null
  const endIso = endDate ? new Date(endDate + 86400000).toISOString() : null

  const result = await content().listArticles({
    page,
    limit: PAGE_SIZE,
    // dedup por content_hash (group_by + group_limit:1 no comportamento original).
    dedup: true,
    filter: {
      themeLabel: theme_1_level_1,
      startDate: startIso,
      endDate: endIso,
      agencies: agencies && agencies.length > 0 ? agencies : null,
    },
  })

  return {
    articles: result.articles,
    page: page + 1,
  }
}
