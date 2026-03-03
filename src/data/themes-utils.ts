'use server'

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { unstable_cache } from 'next/cache'

/**
 * Tipos base
 */
export type Theme = {
  label: string
  code: string
  children?: Theme[]
}

export type ThemeOption = {
  key: string
  name: string
  hierarchyPath?: string
}

/**
 * Função interna que carrega o YAML de temas.
 */
async function loadThemesYaml(): Promise<Theme[]> {
  const filePath = path.join(process.cwd(), 'src', 'config', 'themes.yaml')
  const file = fs.readFileSync(filePath, 'utf8')
  const fullFile = yaml.load(file) as { themes: Theme[] }
  return fullFile.themes
}

/**
 * Lê e retorna todos os temas do YAML.
 * O resultado é cacheado usando Next.js cache para máxima performance.
 * Revalida a cada 1 hora (ajuste conforme necessário).
 */
export const getThemesByLabel = unstable_cache(
  loadThemesYaml,
  ['themes-yaml'],
  {
    revalidate: 3600, // 1 hour - adjust based on how often external data changes
    tags: ['themes'],
  },
)

/**
 * Retorna um array achatado de todos os temas (incluindo sub-temas)
 */
function flattenThemes(themes: Theme[]): Theme[] {
  const result: Theme[] = []

  for (const theme of themes) {
    result.push(theme)
    if (theme.children) {
      result.push(...flattenThemes(theme.children))
    }
  }

  return result
}

/**
 * Retorna uma lista simplificada de temas de nível 1 (principais) para exibição
 */
export async function getThemesList(): Promise<ThemeOption[]> {
  const themes = await getThemesByLabel()

  return themes.map((theme) => ({
    key: theme.label,
    name: theme.label,
  }))
}

/**
 * Retorna todos os temas incluindo a hierarquia completa (flattened para exibição)
 */
export async function getThemesWithHierarchy(): Promise<ThemeOption[]> {
  const themes = await getThemesByLabel()
  const result: ThemeOption[] = []

  function addThemeWithHierarchy(
    theme: Theme,
    level: number = 1,
    parentPath: string[] = [],
  ) {
    // Criar prefixo de indentação baseado no nível (sem caracteres visuais)
    const prefix = level === 1 ? '' : '  '.repeat(level - 1)
    const currentPath = [...parentPath, theme.label]
    const hierarchyPath = currentPath.join(' > ')

    result.push({
      key: theme.code,
      name: `${prefix}${theme.label}`,
      hierarchyPath,
    })
    if (theme.children) {
      for (const child of theme.children) {
        addThemeWithHierarchy(child, level + 1, currentPath)
      }
    }
  }

  for (const theme of themes) {
    addThemeWithHierarchy(theme)
  }

  return result
}

/**
 * Retorna a estrutura completa de temas com hierarquia para componentes avançados
 */
export async function getThemesHierarchy(): Promise<Theme[]> {
  return getThemesByLabel()
}

/**
 * Retorna apenas os temas de nível 1 (para uso em tree view ou acordeão)
 */
export async function getTopLevelThemes(): Promise<Theme[]> {
  return getThemesByLabel()
}

/**
 * Retorna o código de um tema a partir de sua label (nível 1)
 */
export async function getThemeCodeByLabel(
  themeLabel: string | null | undefined,
): Promise<string | undefined> {
  if (!themeLabel) return undefined
  const themes = await getThemesByLabel()
  const allThemes = flattenThemes(themes)
  const theme = allThemes.find((t) => t.label === themeLabel)
  return theme?.code
}

/**
 * Retorna o nome de um tema a partir de sua label
 */
export async function getThemeName(
  themeLabel: string | null | undefined,
): Promise<string | undefined> {
  if (!themeLabel) return undefined
  const themes = await getThemesByLabel()
  const allThemes = flattenThemes(themes)
  const theme = allThemes.find((t) => t.label === themeLabel)
  return theme?.label
}

/**
 * Retorna o nome de um tema a partir do código
 */
export async function getThemeNameByCode(
  themeCode: string | null | undefined,
): Promise<string | undefined> {
  if (!themeCode) return undefined
  const themes = await getThemesByLabel()
  const allThemes = flattenThemes(themes)
  const theme = allThemes.find((t) => t.code === themeCode)
  return theme?.label
}

/**
 * Builds a hierarchy path for a theme (e.g., "Economia > Política > Fiscal")
 * from the YAML hierarchy structure
 */
export async function getThemeHierarchyPath(
  themeCode: string,
): Promise<string> {
  const themes = await getThemesByLabel()
  const allThemes = flattenThemes(themes)
  const theme = allThemes.find((t) => t.code === themeCode)

  if (!theme) return themeCode

  // Build path by finding parent items in the hierarchy
  const path: string[] = [theme.label]
  let currentTheme = theme

  // Recursively find parents
  function findParent(
    targetTheme: Theme,
    searchThemes: Theme[],
  ): Theme | undefined {
    for (const t of searchThemes) {
      if (t.children) {
        for (const child of t.children) {
          if (child.code === targetTheme.code) {
            return t
          }
          const grandParent = findParent(targetTheme, [child])
          if (grandParent) return grandParent
        }
      }
    }
    return undefined
  }

  while (true) {
    const parent = findParent(currentTheme, themes)
    if (!parent) break
    path.unshift(parent.label)
    currentTheme = parent
  }

  return path.join(' > ')
}
