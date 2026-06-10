/**
 * Helpers de slug para páginas de entidade (`/entidades/[slug]`).
 *
 * O slug é uma forma kebab-case sem acentos do texto canônico da entidade
 * (ex.: "Ministério da Saúde" → "ministerio-da-saude"). Como o filtro de busca
 * (`filter.entities`) precisa do TEXTO canônico exato (não do slug), a página
 * resolve o texto via `entitySuggestions(query=<deslug aproximado>)` e escolhe
 * o melhor match. `deslugifyEntity` produz uma string legível só para alimentar
 * essa busca por prefixo — não é o texto canônico.
 */

import { removeDiacritics } from '@/lib/utils'

/**
 * Converte o texto canônico de uma entidade em um slug URL-safe.
 *
 * @example
 * slugifyEntity('Ministério da Saúde') // 'ministerio-da-saude'
 * slugifyEntity('Lula') // 'lula'
 */
export function slugifyEntity(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // não-alfanuméricos → hífen
    .replace(/^-+|-+$/g, '') // remove hífens nas pontas
}

/**
 * Converte um slug de volta para uma string de busca aproximada (legível),
 * usada como `query` em `entitySuggestions` para reencontrar o texto canônico.
 * NÃO produz o texto canônico exato (acentos/caixa se perdem no slug).
 *
 * @example
 * deslugifyEntity('ministerio-da-saude') // 'ministerio da saude'
 */
export function deslugifyEntity(slug: string): string {
  return slug.replace(/-+/g, ' ').trim()
}

/**
 * Dado um slug e uma lista de candidatos (textos canônicos), escolhe o que
 * melhor casa: primeiro um match exato de slug; senão, o primeiro candidato
 * cujo slug começa com o slug-alvo; senão `null`.
 */
export function matchEntityBySlug(
  slug: string,
  candidates: string[],
): string | null {
  const target = slugifyEntity(deslugifyEntity(slug))
  const exact = candidates.find((c) => slugifyEntity(c) === target)
  if (exact) return exact
  const prefix = candidates.find((c) => slugifyEntity(c).startsWith(target))
  return prefix ?? null
}
