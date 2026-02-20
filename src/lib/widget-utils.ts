import { type WidgetConfig, WidgetConfigSchema } from '@/types/widget'

/**
 * Encoda a configuração do widget em base64 URL-safe
 */
export function encodeWidgetConfig(config: WidgetConfig): string {
  const json = JSON.stringify(config)
  const base64 = Buffer.from(json).toString('base64')
  // Torna URL-safe: substitui +/ por -_ e remove padding =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decoda a configuração do widget de base64 URL-safe
 * @throws Error se o base64 for inválido ou a config não passar na validação
 */
export function decodeWidgetConfig(encoded: string): WidgetConfig {
  try {
    // Reverte URL-safe: -_ para +/
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')

    // Adiciona padding se necessário
    const padding = (4 - (base64.length % 4)) % 4
    base64 += '='.repeat(padding)

    const json = Buffer.from(base64, 'base64').toString('utf-8')
    const parsed = JSON.parse(json)

    // Valida com Zod
    const result = WidgetConfigSchema.safeParse(parsed)

    if (!result.success) {
      throw new Error(`Configuração inválida: ${result.error.message}`)
    }

    return result.data
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Falha ao decodar configuração: ${error.message}`)
    }
    throw new Error('Falha ao decodar configuração')
  }
}

/**
 * Valida se uma lista de agências existe
 */
export function validateAgencies(
  agencies: string[],
  validAgencies: string[],
): boolean {
  return agencies.every((agency) => validAgencies.includes(agency))
}

/**
 * Valida se uma lista de temas existe
 */
export function validateThemes(
  themes: string[],
  validThemes: string[],
): boolean {
  return themes.every((theme) => validThemes.includes(theme))
}

/**
 * Gera o código iframe para embedding
 */
export function generateIframeCode(
  config: WidgetConfig,
  baseUrl: string,
): string {
  const encoded = encodeWidgetConfig(config)
  const width = config.size === 'custom' ? config.width : undefined
  const height = config.size === 'custom' ? config.height : undefined

  // Pega dimensões do preset se não for custom
  let finalWidth = width
  let finalHeight = height

  if (config.size !== 'custom') {
    const preset = getWidgetPreset(config.layout, config.size)
    finalWidth = preset.width
    finalHeight = preset.height
  }

  return `<iframe
  src="${baseUrl}/embed?c=${encoded}"
  width="${finalWidth}"
  height="${finalHeight}"
  frameborder="0"
  scrolling="auto"
  title="Widget DGB - Destaques Gov.br"
></iframe>`
}

/**
 * Obtém o preset de dimensões para um layout/size
 */
export function getWidgetPreset(
  layout: WidgetConfig['layout'],
  size: WidgetConfig['size'],
): { width: number; height: number; articlesDefault: number } {
  // Importa dinamicamente para evitar circular dependency
  const presets = getWidgetPresets()
  return presets[layout][size]
}

/**
 * Retorna todos os presets de dimensões
 */
function getWidgetPresets() {
  return {
    list: {
      small: { width: 300, height: 400, articlesDefault: 5 },
      medium: { width: 400, height: 600, articlesDefault: 10 },
      large: { width: 500, height: 800, articlesDefault: 15 },
      custom: { width: 400, height: 600, articlesDefault: 10 }, // fallback
    },
    'grid-2': {
      small: { width: 600, height: 400, articlesDefault: 6 },
      medium: { width: 700, height: 600, articlesDefault: 10 },
      large: { width: 800, height: 800, articlesDefault: 14 },
      custom: { width: 700, height: 600, articlesDefault: 10 },
    },
    'grid-3': {
      small: { width: 900, height: 400, articlesDefault: 9 },
      medium: { width: 1000, height: 600, articlesDefault: 12 },
      large: { width: 1200, height: 800, articlesDefault: 18 },
      custom: { width: 1000, height: 600, articlesDefault: 12 },
    },
    carousel: {
      small: { width: 400, height: 300, articlesDefault: 5 },
      medium: { width: 700, height: 400, articlesDefault: 10 },
      large: { width: 1000, height: 500, articlesDefault: 15 },
      custom: { width: 700, height: 400, articlesDefault: 10 },
    },
  }
}
