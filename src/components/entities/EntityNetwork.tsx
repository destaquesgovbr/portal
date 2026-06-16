'use client'

/**
 * Visualização de rede ego-centrada de uma entidade (Fase 6d).
 *
 * Wrapper client com toggle (default OFF): o grafo só carrega/renderiza quando
 * o usuário liga — economiza a query e o canvas pesado para quem só quer ler as
 * notícias. O canvas (`EntityNetworkGraph`) é importado dinamicamente com
 * `ssr:false` porque `react-force-graph-2d` depende de `window`.
 *
 * A query (`entityNetwork`) roda via react-query através da server action
 * `getEntityNetwork`. Toda a rede (nós + arestas) já vem capada pelo backend
 * (`limit` + threshold de peso) para evitar hairball.
 */

import { useQuery } from '@tanstack/react-query'
import { Network } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Client-only: depende de window/canvas. ssr:false evita quebrar o SSR da página.
const EntityNetworkGraph = dynamic(() => import('./EntityNetworkGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-primary/10 bg-primary/[0.02] text-sm text-primary/50">
      Carregando rede…
    </div>
  ),
})

export type EntityNetworkProps = {
  /** Id canônico da entidade-foco (`Q…`/`dgb_…`). */
  entityId: string
  /** Profundidade da rede (saltos). Default 1 (vizinhos imediatos). */
  depth?: number
  /** Limite de nós retornados pelo backend. Default 50. */
  limit?: number
  /**
   * Busca a rede. Injetável para testes; default usa a server action
   * `getEntityNetwork` (resolvida no consumidor para evitar acoplar este
   * componente client à action diretamente nos testes).
   */
  fetchNetwork: (
    id: string,
    depth: number,
    limit: number,
  ) => Promise<import('@/services/content/types').EntityNetwork>
}

export default function EntityNetwork({
  entityId,
  depth = 1,
  limit = 50,
  fetchNetwork,
}: EntityNetworkProps) {
  const [open, setOpen] = useState(false)

  const networkQ = useQuery({
    queryKey: ['entity-network', entityId, depth, limit],
    queryFn: () => fetchNetwork(entityId, depth, limit),
    // Só dispara a query depois que o usuário liga o toggle.
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const network = networkQ.data
  const hasGraph = (network?.nodes.length ?? 0) > 0

  return (
    <section className="mx-auto mb-12 max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary/70">
          Rede de entidades
        </h2>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Network className="h-4 w-4" aria-hidden />
          {open ? 'Ocultar rede' : 'Ver rede'}
        </Button>
      </div>

      {open && (
        <div>
          {networkQ.isLoading && (
            <div className="flex h-[420px] items-center justify-center rounded-lg border border-primary/10 bg-primary/[0.02] text-sm text-primary/50">
              Carregando rede…
            </div>
          )}

          {!networkQ.isLoading && networkQ.isError && (
            <p className="text-center text-sm text-red-500">
              Não foi possível carregar a rede de entidades.
            </p>
          )}

          {!networkQ.isLoading && !networkQ.isError && !hasGraph && (
            <p className="text-center text-sm text-primary/50">
              Ainda não há conexões suficientes para montar a rede desta
              entidade.
            </p>
          )}

          {!networkQ.isLoading && !networkQ.isError && hasGraph && network && (
            <>
              <EntityNetworkGraph network={network} egoId={entityId} />
              <p className="mt-2 text-center text-xs text-primary/40">
                Clique em uma entidade para navegar. A espessura da linha indica
                quantas notícias mencionam o par.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
