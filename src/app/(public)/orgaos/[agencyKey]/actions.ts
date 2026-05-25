'use server'

import { typesense } from '@/services/typesense/client'
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

export async function getArticles(
  args: GetArticlesArgs,
): Promise<GetArticlesResult> {
  const { agency, page, startDate, endDate, themes } = args

  const filter_by: string[] = [`agency:=${agency}`]

  if (startDate) {
    filter_by.push(`published_at:>=${Math.floor(startDate / 1000)}`)
  }

  if (endDate) {
    filter_by.push(`published_at:<${Math.floor(endDate / 1000) + 86400}`)
  }

  if (themes && themes.length > 0) {
    // Filter by any theme level - level 1, 2, or 3
    const themeFilters = themes.map(
      (theme) =>
        `(theme_1_level_1_code:${theme} || theme_1_level_2_code:${theme} || theme_1_level_3_code:${theme})`,
    )
    filter_by.push(`(${themeFilters.join(' || ')})`)
  }

  // biome-ignore format: true
  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: '*',
      sort_by: 'published_at:desc, unique_id:desc',
      filter_by: filter_by.join(" && "),
      limit: PAGE_SIZE,
      page
    })

  return {
    articles: result.hits?.map((hit) => hit.document) ?? [],
    page: page + 1,
  }
}
