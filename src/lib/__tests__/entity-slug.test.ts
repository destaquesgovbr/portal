import { describe, expect, it } from 'vitest'
import {
  deslugifyEntity,
  isCanonicalEntityId,
  matchEntityBySlug,
  slugifyEntity,
} from '@/lib/entity-slug'

describe('slugifyEntity', () => {
  it('converte texto acentuado em kebab-case sem acentos', () => {
    expect(slugifyEntity('Ministério da Saúde')).toBe('ministerio-da-saude')
    expect(slugifyEntity('Lula')).toBe('lula')
  })

  it('remove pontuação e hífens nas pontas', () => {
    expect(slugifyEntity('Minha Casa, Minha Vida')).toBe(
      'minha-casa-minha-vida',
    )
    expect(slugifyEntity('  (FINEP)  ')).toBe('finep')
  })
})

describe('isCanonicalEntityId', () => {
  it('reconhece QIDs do Wikidata', () => {
    expect(isCanonicalEntityId('Q216330')).toBe(true)
    expect(isCanonicalEntityId('Q1')).toBe(true)
  })

  it('reconhece ids internos dgb_', () => {
    expect(isCanonicalEntityId('dgb_01h8xyz')).toBe(true)
    expect(isCanonicalEntityId('dgb_')).toBe(true)
  })

  it('trata texto legado (kebab-case) como NÃO canônico', () => {
    expect(isCanonicalEntityId('ministerio-da-saude')).toBe(false)
    expect(isCanonicalEntityId('lula')).toBe(false)
    expect(isCanonicalEntityId('bolsa-familia')).toBe(false)
  })

  it('não confunde QID parcial/inválido com canônico', () => {
    // 'Q' sem dígitos, ou 'Q' seguido de não-dígitos → legado.
    expect(isCanonicalEntityId('Q')).toBe(false)
    expect(isCanonicalEntityId('Qabc')).toBe(false)
    expect(isCanonicalEntityId('Q216330-extra')).toBe(false)
  })
})

describe('matchEntityBySlug', () => {
  it('prefere match exato de slug', () => {
    const candidates = ['Ministério da Saúde', 'Ministério da Saúde do Líbano']
    expect(matchEntityBySlug('ministerio-da-saude', candidates)).toBe(
      'Ministério da Saúde',
    )
  })

  it('cai em match por prefixo quando não há exato', () => {
    const candidates = ['Ministério da Saúde do Líbano']
    expect(matchEntityBySlug('ministerio-da-saude', candidates)).toBe(
      'Ministério da Saúde do Líbano',
    )
  })

  it('retorna null quando nada casa', () => {
    expect(matchEntityBySlug('inexistente', ['Lula'])).toBeNull()
  })
})

describe('deslugifyEntity', () => {
  it('reconstrói uma string de busca aproximada', () => {
    expect(deslugifyEntity('ministerio-da-saude')).toBe('ministerio da saude')
  })
})
