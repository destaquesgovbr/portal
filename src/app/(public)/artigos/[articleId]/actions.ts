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
