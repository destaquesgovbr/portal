'use server'

import { auth } from '@/auth'
import { createSSRClient } from '@/lib/graphql/client'
import { getClippingService } from '@/services/clipping'
import type { ReleaseWithContext } from '@/services/clipping/types'

/**
 * Busca um release por ID via GraphQL (substitui o acesso direto ao Firestore).
 *
 * Caminho server-side: monta um `createSSRClient` com o token da sessão (quando
 * logado) para que o resolver `release(id)` aplique a autorização correta —
 * público quando o listing fonte está ativo; autor/assinante caso contrário.
 *
 * O resolver agora popula `recortes` (filtros do clipping fonte) e
 * `marketplaceListingId` (listing ativo, ou null), então a seção de recortes e
 * o link "ver no marketplace" da página voltam a funcionar.
 *
 * Nota sobre metadata: `page.tsx#generateMetadata` lê `release.digest` para
 * derivar a description. O resolver NÃO expõe o `digest` (texto puro) — só
 * `digestPreview` (computado no servidor, ≤150 chars). Como não podemos editar
 * `page.tsx` neste stream, populamos `digest` com o valor de `digestPreview`
 * como fallback seguro, mantendo a metadata funcional sem tocar na página.
 */
export async function getReleaseById(
  releaseId: string,
): Promise<ReleaseWithContext | null> {
  try {
    const session = await auth()
    const client = createSSRClient(async () => session?.accessToken ?? null)
    const release = await getClippingService(client).getReleaseById(releaseId)
    if (!release) return null

    // `page.tsx#generateMetadata` ainda lê `release.digest` (texto puro), que o
    // resolver não expõe. Usamos `digestPreview` como fallback para a metadata.
    return {
      ...release,
      digest: release.digest || release.digestPreview || '',
    }
  } catch (error) {
    console.error('Error fetching release:', error)
    return null
  }
}
