'use client'

/**
 * Lente semântica — renderiza o corpo da notícia (texto plano) com as entidades
 * destacadas inline e ligáveis às respectivas páginas de entidade.
 *
 * Contrato de robustez (validate-then-split): o NER rodou sobre o texto plano,
 * enquanto o corpo servido pode divergir (Markdown ↔ plain-text, drift
 * Typesense ↔ Postgres). Portanto cada span é **validado** antes de destacar:
 * descartamos qualquer anotação cujo `content.slice(start,end)` foldado (NFC +
 * casefold + sem acento) não bata com `annotation.text` foldado. Span inválido
 * simplesmente não é destacado (cobertura parcial aceitável; nunca destaca
 * errado).
 *
 * O destaque é um tint de fundo sutil + borda inferior (não um chip cheio) para
 * preservar o fluxo de leitura. Cada destaque é um `next/link` inline.
 */

import Link from 'next/link'
import { slugifyEntity } from '@/lib/entity-slug'
import { entityTypeStyle } from '@/lib/entity-types'
import type { ContentAnnotation } from '@/types/article'

/**
 * Dobra (fold) uma string para comparação tolerante: NFC, casefold
 * (lowercase) e remoção de acentos. Espelha a derivação determinística de
 * offsets do feature-worker, defendendo contra drift de conteúdo no render.
 */
export function foldForMatch(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Um segmento plano do texto: texto puro, ou uma entidade destacável. */
export type LensSegment =
  | { kind: 'text'; text: string; start: number }
  | {
      kind: 'entity'
      text: string
      start: number
      end: number
      type: string
      canonicalId: string | null
    }

/**
 * Constrói os segmentos planos do texto a partir das anotações.
 *
 * Passos:
 *  1. **validate**: mantém só spans cujo `content.slice` foldado == `text` foldado.
 *  2. **sort + dedupe overlap**: ordena por `start asc`; descarta qualquer span
 *     que comece antes do fim do anterior aceito (overlaps já são resolvidos
 *     upstream por longest-match-wins, mas defendemos aqui por garantia).
 *  3. **split**: caminha o cursor emitindo texto puro entre spans + os spans.
 */
export function buildSegments(
  content: string,
  annotations: ContentAnnotation[],
): LensSegment[] {
  const valid = annotations
    .filter((a) => {
      if (
        !Number.isInteger(a.start) ||
        !Number.isInteger(a.end) ||
        a.start < 0 ||
        a.end > content.length ||
        a.start >= a.end
      ) {
        return false
      }
      return (
        foldForMatch(content.slice(a.start, a.end)) === foldForMatch(a.text)
      )
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const segments: LensSegment[] = []
  let cursor = 0

  for (const a of valid) {
    // Pula spans que se sobrepõem a um já emitido (non-overlapping).
    if (a.start < cursor) continue

    if (a.start > cursor) {
      segments.push({
        kind: 'text',
        text: content.slice(cursor, a.start),
        start: cursor,
      })
    }

    segments.push({
      kind: 'entity',
      text: content.slice(a.start, a.end),
      start: a.start,
      end: a.end,
      type: a.type,
      canonicalId: a.canonical_id ?? null,
    })
    cursor = a.end
  }

  if (cursor < content.length) {
    segments.push({ kind: 'text', text: content.slice(cursor), start: cursor })
  }

  return segments
}

/** Destino da entidade: página canônica quando há id; senão fallback de texto. */
function entityHref(text: string, canonicalId: string | null): string {
  return canonicalId
    ? `/entidades/${canonicalId}`
    : `/entidades/${slugifyEntity(text)}`
}

export function SemanticLens({
  content,
  annotations,
}: {
  content: string
  annotations: ContentAnnotation[]
}) {
  const segments = buildSegments(content, annotations)

  return (
    <p className="whitespace-pre-wrap">
      {segments.map((segment) => {
        if (segment.kind === 'text') {
          // Key estável pelo offset de início (único e nunca o índice do array).
          return <span key={`t-${segment.start}`}>{segment.text}</span>
        }
        const style = entityTypeStyle(segment.type)
        return (
          <Link
            key={`${segment.start}-${segment.end}`}
            href={entityHref(segment.text, segment.canonicalId)}
            title={`Ver notícias sobre ${segment.text}`}
            aria-label={`Ver notícias sobre ${segment.text}`}
            className={`rounded-sm px-0.5 transition-colors ${style.lens}`}
          >
            {segment.text}
          </Link>
        )
      })}
    </p>
  )
}
