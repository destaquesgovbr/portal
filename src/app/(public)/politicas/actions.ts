'use server'

import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'
import type { PolicyItem } from '@/services/content/types'

function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

export async function getPolicies(
  domain?: string | null,
  lifecyclePhase?: string | null,
): Promise<PolicyItem[]> {
  try {
    return await content().getPolicies({ domain, lifecyclePhase, limit: 200 })
  } catch {
    return []
  }
}
