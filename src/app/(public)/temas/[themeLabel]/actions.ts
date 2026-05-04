'use server'

import { typesense } from '@/services/typesense/client'
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

export async function getArticles(
  args: GetArticlesArgs,
): Promise<GetArticlesResult> {
  const { theme_1_level_1, page, startDate, endDate, agencies } = args

  const filter_by: string[] = [`theme_1_level_1_label:=${theme_1_level_1}`]

  if (startDate) {
    filter_by.push(`published_at:>${Math.floor(startDate / 1000)}`)
  }

  if (endDate) {
    filter_by.push(`published_at:<${Math.floor(endDate / 1000 + 60 * 60 * 3)}`)
  }

  if (agencies && agencies.length > 0) {
    filter_by.push(`agency:[${agencies.join(',')}]`)
  }

  // biome-ignore format: true
  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: '*',
      sort_by: 'published_at:desc, unique_id:desc',
      filter_by: filter_by.join(" && "),
      group_by: 'content_hash',
      group_limit: 1,
      limit: PAGE_SIZE,
      page
    })

  return {
    articles:
      result.grouped_hits?.flatMap((group) =>
        group.hits.map((hit) => hit.document),
      ) ?? [],
    page: page + 1,
  }
}
