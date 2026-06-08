'use server'

import { getAgencyField } from '@/data/agencies-utils'
import { createSSRClient } from '@/lib/graphql/client'
import { ResultError, withResult } from '@/lib/result'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { ArticleRow } from '@/types/article'

export type GetArticleError = 'not_found' | 'db_error'

/** Cliente GraphQL público (sem token) para as server actions de artigo. */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

export const getArticleById = withResult(
  async (id: string): Promise<ArticleRow> => {
    let article: ArticleRow | null
    try {
      article = await content().getArticle(id)
    } catch {
      throw new ResultError<GetArticleError>('db_error')
    }

    if (!article) throw new ResultError<GetArticleError>('not_found')

    const agencyName = await getAgencyField(article.agency, 'name')

    return {
      ...article,
      agency: agencyName || 'Órgão público federal',
    }
  },
  {} as GetArticleError,
)

export async function getSimilarArticles(
  article: ArticleRow,
  limit = 4,
): Promise<ArticleRow[]> {
  // O graphql-api `relatedArticles` replica server-side a lógica baseada em
  // tema (mesmo `most_specific_theme_code`/nível 1) que antes vivia aqui.
  return content().getRelatedArticles(article.unique_id, limit)
}
