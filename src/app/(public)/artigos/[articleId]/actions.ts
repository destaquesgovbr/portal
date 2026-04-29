'use server'

import { getAgencyField } from '@/data/agencies-utils'
import { ResultError, withResult } from '@/lib/result'
import { typesense } from '@/services/typesense/client'
import type { ArticleRow } from '@/types/article'

export type GetArticleError = 'not_found' | 'db_error'

export const getArticleById = withResult(
  async (id: string): Promise<ArticleRow> => {
    const result = await typesense
      .collections<ArticleRow>('news')
      .documents()
      .search({
        q: '*',
        filter_by: `unique_id:=${id}`,
      })

    if (!result.hits || result.hits.length === 0)
      throw new ResultError<GetArticleError>('not_found')

    const agencyName = await getAgencyField(
      result.hits[0].document.agency,
      'name',
    )

    return {
      ...result.hits[0].document,
      agency: agencyName || 'Órgão público federal',
    }
  },
  {} as GetArticleError,
)

export async function getSimilarArticles(
  article: ArticleRow,
  limit = 4,
): Promise<ArticleRow[]> {
  const filters: string[] = [`unique_id:!=${article.unique_id}`]

  if (article.most_specific_theme_code) {
    filters.push(
      `(theme_1_level_1_code:=${article.most_specific_theme_code} || theme_1_level_2_code:=${article.most_specific_theme_code} || theme_1_level_3_code:=${article.most_specific_theme_code})`,
    )
  } else if (article.theme_1_level_1_code) {
    filters.push(`theme_1_level_1_code:=${article.theme_1_level_1_code}`)
  }

  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: '*',
      filter_by: filters.join(' && '),
      sort_by: 'published_at:desc',
      group_by: 'content_hash',
      group_limit: 1,
      limit,
    })

  return (
    result.grouped_hits?.flatMap((group) =>
      group.hits.map((hit) => hit.document),
    ) ?? []
  )
}
