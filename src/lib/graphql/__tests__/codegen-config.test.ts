/**
 * Smoke test: verifica que `codegen.ts` é válido sintaticamente
 * e expõe uma config compatível com `@graphql-codegen/cli`.
 *
 * Não exige schema GraphQL disponível — apenas que o arquivo carregue
 * sem erros de TypeScript / runtime.
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('codegen.ts', () => {
  it('test_codegen_config_pointsToValid_schema_path: carrega o módulo e expõe um schema + generates', async () => {
    const configPath = path.resolve(__dirname, '../../../../codegen.ts')
    const mod = await import(/* @vite-ignore */ configPath)
    const config = mod.default

    expect(config).toBeDefined()
    expect(config.schema).toBeDefined()
    expect(typeof config.schema).toBe('string')
    expect(config.generates).toBeDefined()
    expect(typeof config.generates).toBe('object')

    // Pelo menos um target gerado configurado
    const targets = Object.keys(config.generates)
    expect(targets.length).toBeGreaterThan(0)
  })

  it('test_codegen_config_uses_expected_plugins: target principal inclui typescript + typescript-operations + typed-document-node', async () => {
    const configPath = path.resolve(__dirname, '../../../../codegen.ts')
    const mod = await import(/* @vite-ignore */ configPath)
    const config = mod.default
    const target = Object.values(config.generates)[0] as {
      plugins?: string[]
    }
    expect(target.plugins).toContain('typescript')
    expect(target.plugins).toContain('typescript-operations')
    expect(target.plugins).toContain('typed-document-node')
  })
})
