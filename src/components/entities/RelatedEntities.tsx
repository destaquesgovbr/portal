/**
 * Seção "Entidades relacionadas" da página `/entidades/[id]` (Fase 6d).
 *
 * Renderiza chips a partir de `relatedEntities` (co-menção, 1-hop): cada chip é
 * um Link para a página da entidade vizinha (`/entidades/{canonicalId}`), com
 * cor/ícone por tipo (reusando `lib/entity-types.ts`) e o peso da aresta
 * ("N notícias juntas"). A seção se esconde quando não há vizinhos — o grafo é
 * parcial (cresce conforme o backfill de canonicalização avança).
 *
 * Componente puro/presentacional (recebe os dados prontos) — testável sem rede.
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { entityTypeStyle } from '@/lib/entity-types'
import type { RelatedEntity } from '@/services/content/types'

/** Rótulo do peso da aresta, em PT-BR ("3 notícias juntas"). */
function weightLabel(weight: number): string {
  const n = new Intl.NumberFormat('pt-BR').format(weight)
  return `${n} notícia${weight === 1 ? '' : 's'} juntas`
}

function RelatedEntityChip({ entity }: { entity: RelatedEntity }) {
  const style = entityTypeStyle(entity.type ?? 'OTHER')
  const Icon = style.icon
  const name = entity.canonicalName ?? entity.canonicalId

  return (
    <Link
      href={`/entidades/${entity.canonicalId}`}
      aria-label={`Ver a entidade ${name} (${weightLabel(entity.weight)})`}
    >
      <Badge className="gap-1.5 bg-white py-1 pr-2.5 pl-2 font-medium text-primary transition-colors hover:bg-primary/5 cursor-pointer">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
          aria-hidden
        />
        <Icon className="h-3.5 w-3.5 text-primary/50" aria-hidden />
        {name}
        <span className="ml-0.5 text-primary/40">{entity.weight}</span>
      </Badge>
    </Link>
  )
}

export function RelatedEntities({
  entities,
}: {
  entities?: RelatedEntity[] | null
}) {
  if (!entities || entities.length === 0) return null

  return (
    <section className="mx-auto mb-12 max-w-3xl">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary/70">
        Entidades relacionadas
      </h2>
      <div className="flex flex-wrap gap-2">
        {entities.map((entity) => (
          <RelatedEntityChip key={entity.canonicalId} entity={entity} />
        ))}
      </div>
    </section>
  )
}
