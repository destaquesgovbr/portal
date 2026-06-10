/**
 * Fonte única de verdade do esquema visual de tipos de entidade (NER).
 *
 * Os mesmos tipos e cores são consumidos por:
 *   - `ArticleFeatures.tsx` (chips agrupados "Entidades mencionadas")
 *   - `EntityPageClient.tsx` (cabeçalho da página de entidade canônica)
 *   - `SemanticLens.tsx` (destaque inline da lente semântica)
 *
 * A paleta segue o esquema institucional (government-blue/green/yellow já em uso)
 * e atribui cores distintas a cada tipo, mantendo coesão com o design do artigo.
 */

import {
  Building2,
  CalendarDays,
  Landmark,
  type LucideIcon,
  MapPin,
  Tag as TagIcon,
  User,
} from 'lucide-react'

/** Tipos de entidade sancionados pela taxonomia NER evoluída. */
export type EntityTypeKey = 'ORG' | 'PER' | 'LOC' | 'EVENT' | 'POLICY' | 'OTHER'

/** Estilo visual de um tipo de entidade. */
export type EntityTypeStyle = {
  /** Rótulo do grupo (plural), exibido no cabeçalho de seção dos chips. */
  label: string
  /** Ícone lucide representativo do tipo. */
  icon: LucideIcon
  /** Classe Tailwind de cor de fundo do "dot" (marcador do grupo). */
  dot: string
  /**
   * Classes Tailwind do destaque inline da lente: tint de fundo sutil + borda
   * inferior colorida. NÃO é um chip cheio — preserva o fluxo de leitura.
   */
  lens: string
}

/**
 * Mapa tipo → estilo. As cores government-* já existem no tema (globals.css);
 * EVENT/POLICY ganham tons coerentes (roxo/laranja) que se distinguem dos três
 * tipos base sem destoar do esquema institucional.
 */
export const ENTITY_TYPE_STYLES: Record<EntityTypeKey, EntityTypeStyle> = {
  ORG: {
    label: 'Instituições',
    icon: Building2,
    dot: 'bg-government-blue',
    lens: 'bg-government-blue/10 border-b-2 border-government-blue/50 hover:bg-government-blue/20',
  },
  PER: {
    label: 'Pessoas',
    icon: User,
    dot: 'bg-government-green',
    lens: 'bg-government-green/10 border-b-2 border-government-green/50 hover:bg-government-green/20',
  },
  LOC: {
    label: 'Locais',
    icon: MapPin,
    dot: 'bg-government-yellow',
    lens: 'bg-government-yellow/15 border-b-2 border-government-yellow/60 hover:bg-government-yellow/25',
  },
  EVENT: {
    label: 'Eventos',
    icon: CalendarDays,
    dot: 'bg-purple-500',
    lens: 'bg-purple-500/10 border-b-2 border-purple-500/50 hover:bg-purple-500/20',
  },
  POLICY: {
    label: 'Políticas Públicas',
    icon: Landmark,
    dot: 'bg-orange-500',
    lens: 'bg-orange-500/10 border-b-2 border-orange-500/50 hover:bg-orange-500/20',
  },
  OTHER: {
    label: 'Outros',
    icon: TagIcon,
    dot: 'bg-primary/40',
    lens: 'bg-primary/5 border-b-2 border-primary/30 hover:bg-primary/10',
  },
}

/** Ordem canônica de exibição dos grupos de entidade. */
export const ENTITY_TYPE_ORDER: EntityTypeKey[] = [
  'ORG',
  'PER',
  'LOC',
  'EVENT',
  'POLICY',
]

/** Tipos com grupo/cor próprios (exclui o balde `OTHER`). */
export const KNOWN_ENTITY_TYPES = new Set<string>(ENTITY_TYPE_ORDER)

/**
 * Resolve o estilo de um tipo de entidade (string crua do backend), caindo em
 * `OTHER` para qualquer tipo fora da taxonomia conhecida.
 */
export function entityTypeStyle(type: string): EntityTypeStyle {
  return ENTITY_TYPE_STYLES[type as EntityTypeKey] ?? ENTITY_TYPE_STYLES.OTHER
}
