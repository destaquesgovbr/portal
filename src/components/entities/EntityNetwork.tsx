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
import { Maximize2, Minimize2, Network, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

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
  const [expanded, setExpanded] = useState(false)

  // Altura da viewport para o canvas maximizado.
  const [viewportHeight, setViewportHeight] = useState(600)
  useEffect(() => {
    setViewportHeight(window.innerHeight)
    const handler = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Bloqueia scroll e habilita Esc para fechar o overlay.
  useEffect(() => {
    if (!expanded) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  const networkQ = useQuery({
    queryKey: ['entity-network', entityId, depth, limit],
    queryFn: () => fetchNetwork(entityId, depth, limit),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const network = networkQ.data
  const hasGraph = (network?.nodes.length ?? 0) > 0

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (!next) setExpanded(false)
  }

  const graphContent =
    !networkQ.isLoading && !networkQ.isError && hasGraph && network ? (
      <EntityNetworkGraph network={network} egoId={entityId} />
    ) : null

  const hint = (
    <p className="mt-2 text-center text-xs text-primary/40">
      Clique em uma entidade para navegar. A espessura da linha indica quantas
      notícias mencionam o par.
    </p>
  )

  return (
    <section className="mx-auto mb-12 max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary/70">
          Rede de entidades
        </h2>
        <div className="flex items-center gap-1">
          {open && !networkQ.isError && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={expanded ? 'Minimizar rede' : 'Maximizar rede'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
              {expanded ? 'Minimizar' : 'Maximizar'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={open}
            onClick={handleToggle}
          >
            <Network className="h-4 w-4" aria-hidden />
            {open ? 'Ocultar rede' : 'Ver rede'}
          </Button>
        </div>
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

          {graphContent && (
            <>
              {graphContent}
              {hint}
            </>
          )}
        </div>
      )}

      {/* Overlay maximizado: canvas ocupa toda a viewport (z-50) e o botão
          de fechar é fixed z-[60] — acima da stacking context do force-graph */}
      {expanded && (
        <>
          {/* Canvas em tela cheia (ou estado de loading/vazio/erro) */}
          <div className="fixed inset-0 z-[100] bg-background">
            {networkQ.isLoading && (
              <div className="flex h-full items-center justify-center text-sm text-primary/50">
                Carregando rede…
              </div>
            )}
            {!networkQ.isLoading && networkQ.isError && (
              <div className="flex h-full items-center justify-center text-sm text-red-500">
                Não foi possível carregar a rede de entidades.
              </div>
            )}
            {!networkQ.isLoading && !networkQ.isError && !hasGraph && (
              <div className="flex h-full items-center justify-center text-sm text-primary/50">
                Ainda não há conexões suficientes para montar a rede desta
                entidade.
              </div>
            )}
            {hasGraph && network && (
              <EntityNetworkGraph
                network={network}
                egoId={entityId}
                height={viewportHeight}
              />
            )}
          </div>

          {/* Botão de fechar: z-[60] garante que fica acima do canvas */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Fechar visualização expandida (Esc)"
            className="fixed right-4 top-4 z-[110] flex items-center gap-1.5 rounded-md border border-primary/20 bg-background/95 px-3 py-1.5 text-sm font-medium text-primary shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" aria-hidden />
            Fechar
          </button>
        </>
      )}
    </section>
  )
}
