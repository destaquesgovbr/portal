'use client'

import { useRecorteEstimation } from '@/hooks/useRecorteEstimation'
import type { Recorte } from '@/types/clipping'
import { ArticleCountBadge } from './ArticleCountBadge'

type Props = {
  recortes: Recorte[]
}

export function RecorteEstimationBadge({ recortes }: Props) {
  const { total, loading } = useRecorteEstimation(recortes)
  return <ArticleCountBadge count={total} loading={loading} />
}
