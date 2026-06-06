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

  it('test_codegen_config_uses_expected_plugins: target principal inclui typescript + typescript-operations', async () => {
    const configPath = path.resolve(__dirname, '../../../../codegen.ts')
    const mod = await import(/* @vite-ignore */ configPath)
    const config = mod.default
    const target = Object.values(config.generates)[0] as {
      plugins?: string[]
    }
    expect(target.plugins).toContain('typescript')
    expect(target.plugins).toContain('typescript-operations')
  })

  it('test_codegen_documents_match_ts_files: o glob de documents aponta para .ts (as ops são gql`...` em .ts, não .graphql)', async () => {
    // Regressão: o glob antigo apontava para `**/*.graphql` (zero arquivos),
    // então o codegen rodava vazio e nenhum drift ops↔schema era detectado
    // (foi assim que o campo `iteration` inexistente passou). Garante que o
    // gate de fato varre os arquivos onde as operações vivem.
    const configPath = path.resolve(__dirname, '../../../../codegen.ts')
    const mod = await import(/* @vite-ignore */ configPath)
    const config = mod.default
    const documents = (
      Array.isArray(config.documents) ? config.documents : [config.documents]
    ).join(',')
    // Casa arquivos .ts/.tsx (onde vivem os `gql\`...\``), não o glob morto
    // `**/*.graphql` que não casava nada.
    expect(documents).toMatch(/ts/)
    expect(documents).not.toContain('.graphql')
  })
})
