import Link from 'next/link'
import { entityTypeStyle } from '@/lib/entity-types'
import type { TrendingEntity } from '@/services/content/types'

function GrowthBadge({ volumeRatio }: { volumeRatio: number }) {
  const label = `↑${volumeRatio.toFixed(1)}×`
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
      {label}
    </span>
  )
}

function TrendingEntityCard({ entity }: { entity: TrendingEntity }) {
  const style = entityTypeStyle(entity.type)
  const Icon = style.icon

  return (
    <Link
      href={`/entidades/${entity.entityId}`}
      className="
        group relative rounded-xl border bg-card p-5 flex flex-col gap-3
        overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-[2px]
      "
      data-testid="trending-entity-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${style.color}20`, color: style.color }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {style.label}
          </span>
        </div>
        <GrowthBadge volumeRatio={entity.volumeRatio} />
      </div>

      <p className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {entity.canonicalName}
      </p>

      <p className="text-xs text-muted-foreground mt-auto">
        {entity.windowCount} {entity.windowCount === 1 ? 'artigo' : 'artigos'}{' '}
        esta semana
      </p>
    </Link>
  )
}

export function TrendingEntitiesSection({
  entities,
}: {
  entities: TrendingEntity[]
}) {
  if (entities.length === 0) return null

  return (
    <section
      className="py-12 bg-muted/30"
      data-testid="trending-entities-section"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-start">
            <img
              src="/vertical-ribbon.svg"
              alt="decorativo"
              className="w-2 h-14 mr-4 mt-1"
            />
            <div>
              <h2 className="text-2xl font-bold">Entidades em Alta</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Organizações e pessoas com maior crescimento de cobertura nos
                últimos 7 dias.
              </p>
            </div>
          </div>
          <Link
            href="/entidades"
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <TrendingEntityCard key={entity.entityId} entity={entity} />
          ))}
        </div>
      </div>
    </section>
  )
}
