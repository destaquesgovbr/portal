/**
 * Seções de features computadas (news_features) da tela de detalhe da notícia:
 *   - `ArticleFichaBar`: faixa-resumo de leitura (tempo, legibilidade), selo
 *     "Em alta" (trending) e visualizações (best-effort).
 *   - `ArticleEntities`: entidades nomeadas agrupadas (Instituições/Pessoas/
 *     Locais/Outros), cada chip linkando para a busca.
 *
 * Harmoniza com o design institucional do artigo: paleta government-*,
 * componente Badge, ícones lucide, larguras max-w-3xl. Cada bloco se esconde
 * quando não há dado (o pipeline de features é parcial).
 */

import { Clock, Eye, Flame, Gauge, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { slugifyEntity } from '@/lib/entity-slug'
import {
  ENTITY_TYPE_ORDER,
  ENTITY_TYPE_STYLES,
  type EntityTypeKey,
  entityTypeStyle,
  KNOWN_ENTITY_TYPES,
} from '@/lib/entity-types'
import type { ArticleEntity, ArticleFeatures } from '@/types/article'

// trending_score = volume 24h / média 7d por tema (nível 1). >= 1.5 indica
// volume claramente acima da média recente → digno do selo "Em alta".
const TRENDING_THRESHOLD = 1.5
const WORDS_PER_MINUTE = 200

function readingMinutes(wordCount: number | null): number | null {
  if (!wordCount || wordCount <= 0) return null
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
}

function readabilityBand(flesch: number | null): string | null {
  if (flesch == null) return null
  if (flesch >= 70) return 'Leitura fácil'
  if (flesch >= 50) return 'Leitura média'
  return 'Leitura densa'
}

function Stat({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-primary/70">
      <Icon className="w-4 h-4 text-primary/50" aria-hidden />
      {children}
    </span>
  )
}

export function ArticleFichaBar({
  features,
}: {
  features?: ArticleFeatures | null
}) {
  if (!features) return null

  const minutes = readingMinutes(features.word_count)
  const band = readabilityBand(features.readability_flesch)
  const trending =
    features.trending_score != null &&
    features.trending_score >= TRENDING_THRESHOLD
  const views =
    features.view_count && features.view_count > 0 ? features.view_count : null

  if (!minutes && !band && !trending && !views) return null

  return (
    <div className="mx-auto mb-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg border border-primary/10 bg-primary/[0.03] px-5 py-3">
      {trending && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-government-red/10 px-2.5 py-0.5 text-sm font-semibold text-government-red">
          <Flame className="w-4 h-4" aria-hidden />
          Em alta
        </span>
      )}
      {minutes && <Stat icon={Clock}>{minutes} min de leitura</Stat>}
      {band && <Stat icon={Gauge}>{band}</Stat>}
      {views && (
        <Stat icon={Eye}>
          {new Intl.NumberFormat('pt-BR').format(views)} visualizações
        </Stat>
      )}
    </div>
  )
}

/**
 * Destino de navegação de um chip de entidade: a página canônica
 * `/entidades/{canonicalId}` quando a menção já tem id canônico; senão o
 * fallback de texto `/entidades/{slug}` (migração graciosa).
 */
function entityHref(entity: ArticleEntity): string {
  return entity.canonical_id
    ? `/entidades/${entity.canonical_id}`
    : `/entidades/${slugifyEntity(entity.text)}`
}

function EntityChips({ items }: { items: ArticleEntity[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((entity) => (
        <Link
          key={`${entity.type}:${entity.text}`}
          href={entityHref(entity)}
          aria-label={`Ver notícias sobre ${entity.text}`}
        >
          <Badge className="bg-white text-primary font-medium hover:bg-primary/5 transition-colors cursor-pointer">
            {entity.text}
            {entity.count > 1 && (
              <span className="ml-1.5 text-primary/40">{entity.count}</span>
            )}
          </Badge>
        </Link>
      ))}
    </div>
  )
}

type ResolvedGroup = {
  key: string
  label: string
  icon: LucideIcon
  dot: string
  items: ArticleEntity[]
}

/**
 * Agrupa as menções por tipo na ordem canônica (ORG/PER/LOC/EVENT/POLICY),
 * drenando o resíduo para o balde "Outros". Grupos vazios são omitidos.
 */
export function groupEntities(entities: ArticleEntity[]): ResolvedGroup[] {
  const byCountDesc = (a: ArticleEntity, b: ArticleEntity) => b.count - a.count

  const named: ResolvedGroup[] = ENTITY_TYPE_ORDER.map(
    (type: EntityTypeKey) => {
      const style = ENTITY_TYPE_STYLES[type]
      return {
        key: type.toLowerCase(),
        label: style.label,
        icon: style.icon,
        dot: style.dot,
        items: entities.filter((e) => e.type === type).sort(byCountDesc),
      }
    },
  ).filter((group) => group.items.length > 0)

  const others = entities
    .filter((e) => !KNOWN_ENTITY_TYPES.has(e.type))
    .sort(byCountDesc)

  if (others.length > 0) {
    const style = entityTypeStyle('OTHER')
    named.push({
      key: 'outros',
      label: style.label,
      icon: style.icon,
      dot: style.dot,
      items: others,
    })
  }

  return named
}

export function ArticleEntities({
  entities,
}: {
  entities?: ArticleEntity[] | null
}) {
  if (!entities || entities.length === 0) return null

  const groups = groupEntities(entities)
  if (groups.length === 0) return null

  return (
    <section className="mt-12 mb-8 max-w-3xl mx-auto">
      <h2 className="text-sm font-semibold text-primary/70 uppercase tracking-wide mb-4">
        Entidades mencionadas
      </h2>
      <div className="space-y-4">
        {groups.map((group) => {
          const Icon = group.icon
          return (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary/50">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${group.dot}`}
                  aria-hidden
                />
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {group.label}
              </div>
              <EntityChips items={group.items} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
