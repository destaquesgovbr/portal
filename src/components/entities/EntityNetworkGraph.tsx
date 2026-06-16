'use client'

/**
 * Renderização da rede de entidades em canvas (force-directed), Fase 6d.
 *
 * Componente client-only: `react-force-graph-2d` depende de `window`/canvas e
 * NÃO pode rodar em SSR — por isso é importado dinamicamente (ssr:false) pelo
 * `EntityNetwork.tsx`. Aqui só assumimos que estamos no browser.
 *
 * Estética (frontend-design):
 *   - cor do nó por tipo (reusa `entity-types.ts`, fonte única de verdade);
 *   - a entidade-foco (ego) recebe anel destacado e raio maior;
 *   - espessura da aresta ∝ peso (co-menção); grafo já vem capado pelo backend
 *     (`limit`/threshold) — aqui só ajustamos legibilidade;
 *   - clique no nó navega para a página da entidade.
 */

import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { EntityNetwork } from '@/services/content/types'
import {
  type GraphLink,
  type GraphNode,
  maxEdgeWeight,
  toGraphData,
} from './entity-network-data'

export type EntityNetworkGraphProps = {
  /** Rede a desenhar (nós + arestas). */
  network: EntityNetwork
  /** Id canônico da entidade-foco (ego). */
  egoId: string
  /** Altura do canvas (px). Default 420. */
  height?: number
}

export default function EntityNetworkGraph({
  network,
  egoId,
  height = 420,
}: EntityNetworkGraphProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const data = useMemo(() => toGraphData(network, egoId), [network, egoId])

  // Peso máximo p/ normalizar a espessura das arestas (evita divisão por zero).
  const maxWeight = useMemo(() => maxEdgeWeight(data.links), [data.links])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-primary/10 bg-primary/[0.02]"
      style={{ height }}
    >
      <ForceGraph2D
        graphData={data}
        height={height}
        nodeRelSize={4}
        nodeColor={(node) => (node as GraphNode).color}
        nodeVal={(node) => (node as GraphNode).val}
        cooldownTicks={80}
        linkColor={() => 'rgba(15, 23, 42, 0.12)'}
        linkWidth={(link) =>
          0.5 + ((link as unknown as GraphLink).weight / maxWeight) * 3
        }
        onNodeClick={(node) => {
          const id = (node as GraphNode).id
          if (id) router.push(`/entidades/${id}`)
        }}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNode & { x?: number; y?: number }
          if (n.x == null || n.y == null) return

          // Anel destacado para a entidade-foco (ego).
          if (n.isEgo) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, n.val + 2, 0, 2 * Math.PI)
            ctx.strokeStyle = n.color
            ctx.lineWidth = 1.5 / globalScale
            ctx.stroke()
          }

          // Rótulo só quando há zoom suficiente — evita poluição no overview.
          if (globalScale >= 1.2) {
            const fontSize = 11 / globalScale
            ctx.font = `${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
            ctx.fillText(n.name, n.x, n.y + n.val + 1)
          }
        }}
      />
    </div>
  )
}
