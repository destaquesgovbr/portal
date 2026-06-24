/**
 * Transformação pura rede → dados do force-graph (Fase 6d).
 *
 * Isolada do componente de canvas (`EntityNetworkGraph.tsx`) para ser testável
 * sem importar `react-force-graph-2d` (client-only, depende de `window`).
 *
 * Deduz cor por tipo (reusa `entity-types.ts`) e o raio (`val`) a partir do grau
 * (nº de arestas incidentes); a entidade-foco (ego) ganha um piso de raio maior.
 */

import { entityTypeStyle } from '@/lib/entity-types'
import type { EntityNetwork } from '@/services/content/types'

export type GraphNode = {
  id: string
  name: string
  type: string | null
  color: string
  isEgo: boolean
  val: number
}

export type GraphLink = {
  source: string
  target: string
  weight: number
}

export type GraphData = {
  nodes: GraphNode[]
  links: GraphLink[]
}

/** Converte a rede do facade em nós/links do force-graph. */
export function toGraphData(network: EntityNetwork, egoId: string): GraphData {
  const degree = new Map<string, number>()
  for (const edge of network.edges) {
    degree.set(edge.src, (degree.get(edge.src) ?? 0) + 1)
    degree.set(edge.dst, (degree.get(edge.dst) ?? 0) + 1)
  }

  const nodes: GraphNode[] = network.nodes.map((n) => {
    const isEgo = n.entityId === egoId
    const deg = degree.get(n.entityId) ?? 0
    return {
      id: n.entityId,
      name: n.canonicalName ?? n.entityId,
      type: n.type,
      color: entityTypeStyle(n.type ?? 'OTHER').color,
      isEgo,
      // Raio cresce com o grau (suave), com piso maior para o ego.
      val: (isEgo ? 6 : 2) + Math.sqrt(deg),
    }
  })

  const links: GraphLink[] = network.edges.map((e) => ({
    source: e.src,
    target: e.dst,
    weight: e.weight,
  }))

  return { nodes, links }
}

/** Maior peso entre as arestas (>= 1), p/ normalizar a espessura das linhas. */
export function maxEdgeWeight(links: GraphLink[]): number {
  return Math.max(1, ...links.map((l) => l.weight))
}
