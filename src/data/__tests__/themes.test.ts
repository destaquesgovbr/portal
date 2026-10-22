/**
 * Contrato da taxonomia de temas do portal (`src/config/themes.yaml`) e do
 * mapa de ícones/descrições dos L1 (`src/data/themes.ts`).
 *
 * A árvore do portal tem de espelhar a tabela `themes` do Postgres (fonte:
 * `themes/themes_tree_enriched_full.yaml`): sem os L1 22/23 (removidos pelas
 * DEC-001/DEC-002) e com o L1 26 "Defesa Civil e Gestão de Desastres", que
 * recebe os antigos 19.03 (→ 26.01) e 19.04 (→ 26.02) renumerados.
 *
 * O mapa `THEME_ICONS` alimenta os cards de `/temas` e o cabeçalho de
 * `/temas/[label]`; `getThemeIcon` é o acesso seguro (fallback genérico para
 * label sem ícone, em vez de quebrar a página).
 */

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import THEME_ICONS, { getThemeIcon, THEME_ICON_FALLBACK } from '../themes'

type ThemeNode = { label: string; code: unknown; children?: ThemeNode[] }
type FlatTheme = { label: string; code: string; parent: string | null }

const ROOT = process.cwd()

function loadTree(): ThemeNode[] {
  const file = fs.readFileSync(
    path.join(ROOT, 'src', 'config', 'themes.yaml'),
    'utf8',
  )
  return (yaml.load(file) as { themes: ThemeNode[] }).themes
}

function flatten(
  nodes: ThemeNode[],
  parent: string | null = null,
  out: FlatTheme[] = [],
): FlatTheme[] {
  for (const node of nodes) {
    out.push({ label: node.label, code: node.code as string, parent })
    if (node.children) flatten(node.children, node.code as string, out)
  }
  return out
}

const tree = loadTree()
const all = flatten(tree)
const byCode = new Map(all.map((t) => [t.code, t]))
const level = (code: string) => code.split('.').length

function publicFileExists(urlPath: string): boolean {
  return fs.existsSync(path.join(ROOT, 'public', urlPath.replace(/^\//, '')))
}

describe('src/config/themes.yaml — árvore atual', () => {
  it('todos os códigos são strings no formato NN, NN.NN ou NN.NN.NN', () => {
    // Código sem aspas no YAML vira número ('26' → 26, '08' → 8) e quebra o
    // casamento com o banco; por isso exigimos string.
    for (const t of all) {
      expect(typeof t.code, `código de "${t.label}"`).toBe('string')
      expect(t.code).toMatch(/^\d{2}(\.\d{2}){0,2}$/)
    }
  })

  it('códigos são únicos e cada filho herda o prefixo do pai', () => {
    expect(byCode.size).toBe(all.length)
    for (const t of all) {
      if (t.parent === null) {
        expect(level(t.code)).toBe(1)
      } else {
        expect(t.code.startsWith(`${t.parent}.`), t.code).toBe(true)
        expect(level(t.code)).toBe(level(t.parent) + 1)
      }
    }
  })

  it('tem 24 L1, 106 L2 e 459 L3 (589 códigos)', () => {
    const count = (n: number) => all.filter((t) => level(t.code) === n).length
    expect(count(1)).toBe(24)
    expect(count(2)).toBe(106)
    expect(count(3)).toBe(459)
    expect(all).toHaveLength(589)
  })

  it('não tem mais os L1 22/23 nem os L2 19.03/19.04', () => {
    const removed = all.filter((t) =>
      /^(22|23)(\.|$)|^19\.0[34](\.|$)/.test(t.code),
    )
    expect(removed.map((t) => t.code)).toEqual([])
  })

  it('o L1 19 mantém só Segurança Nacional, Missões Militares e Políticas de Defesa', () => {
    const l19 = tree.find((t) => t.code === '19')
    expect(l19?.label).toBe('Defesa e Forças Armadas')
    expect(l19?.children?.map((c) => c.code)).toEqual([
      '19.01',
      '19.02',
      '19.05',
    ])
  })

  it('tem o L1 26 "Defesa Civil e Gestão de Desastres" com 26.01 e 26.02', () => {
    const l26 = tree.find((t) => t.code === '26')
    expect(l26?.label).toBe('Defesa Civil e Gestão de Desastres')

    const children = l26?.children ?? []
    expect(children.map((c) => [c.code, c.label])).toEqual([
      ['26.01', 'Defesa Civil'],
      ['26.02', 'Situações de Emergência'],
    ])
    expect(children[0].children?.map((c) => [c.code, c.label])).toEqual([
      ['26.01.01', 'Preparação para Desastres'],
      ['26.01.02', 'Planejamento de Evacuação'],
      ['26.01.03', 'Resposta a Desastres'],
      ['26.01.04', 'Monitoramento de Riscos Naturais'],
      ['26.01.05', 'Gestão de Abrigos'],
    ])
    expect(children[1].children?.map((c) => [c.code, c.label])).toEqual([
      ['26.02.01', 'Resgate e Salvamento'],
      ['26.02.02', 'Logística de Emergência'],
      ['26.02.03', 'Ações Humanitárias'],
      ['26.02.04', 'Reconstrução Pós-Desastre'],
      ['26.02.05', 'Assistência a Deslocados Internos'],
    ])
  })

  it('os L1 estão em ordem crescente de código, com o 26 por último', () => {
    const codes = tree.map((t) => t.code as string)
    expect(codes).toEqual([...codes].sort())
    expect(codes.at(-1)).toBe('26')
  })
})

describe('THEME_ICONS (src/data/themes.ts)', () => {
  it('tem exatamente um card por L1 da árvore, na mesma ordem', () => {
    expect(Object.keys(THEME_ICONS)).toEqual(tree.map((t) => t.label))
  })

  it('todo ícone aponta para um arquivo existente em public/ e tem descrição', () => {
    for (const [label, entry] of Object.entries(THEME_ICONS)) {
      expect(publicFileExists(entry.image), `${label}: ${entry.image}`).toBe(
        true,
      )
      expect(entry.description.trim().length, label).toBeGreaterThan(0)
    }
  })

  it('o tema 26 usa o ícone próprio', () => {
    expect(THEME_ICONS['Defesa Civil e Gestão de Desastres']?.image).toBe(
      '/26-defesa-civil-e-gestao-de-desastres.svg',
    )
  })
})

describe('getThemeIcon', () => {
  it('devolve a entrada do mapa para um L1 conhecido', () => {
    expect(getThemeIcon('Saúde')).toBe(THEME_ICONS.Saúde)
  })

  it('devolve o fallback genérico para label sem ícone (ou vazio)', () => {
    expect(getThemeIcon('Eventos Oficiais e Cerimônias')).toBe(
      THEME_ICON_FALLBACK,
    )
    expect(getThemeIcon('Tema que não existe')).toBe(THEME_ICON_FALLBACK)
    expect(getThemeIcon(undefined)).toBe(THEME_ICON_FALLBACK)
    expect(getThemeIcon(null)).toBe(THEME_ICON_FALLBACK)
  })

  it('não confunde chaves herdadas de Object com temas', () => {
    expect(getThemeIcon('constructor')).toBe(THEME_ICON_FALLBACK)
    expect(getThemeIcon('toString')).toBe(THEME_ICON_FALLBACK)
  })

  it('o fallback tem imagem existente em public/ e descrição vazia', () => {
    expect(publicFileExists(THEME_ICON_FALLBACK.image)).toBe(true)
    expect(THEME_ICON_FALLBACK.description).toBe('')
  })
})
