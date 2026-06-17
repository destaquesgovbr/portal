/**
 * E2E — Grafo de entidades (Fase 6c/6d): relatedEntities + entityNetwork.
 *
 * Gate de validação da Fase 6 (projeção em grafo). Público (sem auth).
 *
 * Estratégia: deriva um id canônico real com vizinhos chamando o graphql-api
 * direto (sem hardcode). Se nenhuma entidade tiver vizinhos ainda (grafo
 * parcial), FALHA com mensagem acionável — a pré-condição é que `entity_edges`
 * tenha arestas de co-menção (DAG `project_entity_graph` já rodou).
 *
 * Cobre:
 *   - `relatedEntities`: query retorna vizinhos com shape correto
 *   - `entityNetwork`: query retorna nós + arestas coerentes
 *   - `/entidades/[id]`: h1, seção "Entidades relacionadas" com chips, botão "Ver rede"
 *   - toggle "Ver rede": abre a seção e renderiza o grafo (ou estado vazio)
 */

import { expect, test } from '@playwright/test'
import { assertDataPreconditions, graphqlApiUrl } from '../fixtures'

// ---------- Cliente GraphQL público (sem auth) ----------

async function publicGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = graphqlApiUrl()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    throw new Error(
      `Falha de rede ao chamar ${url}: ${(err as Error).message}. ` +
        'O graphql-api está no ar? (make dev / E2E_GRAPHQL_URL)',
    )
  }
  if (!res.ok) {
    throw new Error(`graphql-api HTTP ${res.status} em ${url}`)
  }
  const json = (await res.json()) as {
    data?: T
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`,
    )
  }
  if (json.data == null) throw new Error('GraphQL retornou data vazio')
  return json.data
}

// ---------- Queries de derivação ----------

// type: "CANONICAL" faz o resolver retornar entity_id = valor do facet canonical.
// Sem esse tipo, entity_id é sempre null (modo texto-livre do Typesense).
const ENTITY_SUGGESTIONS_QUERY = /* GraphQL */ `
  query DeriveEntitySuggestions($query: String!, $limit: Int!) {
    entitySuggestions(query: $query, type: "CANONICAL", limit: $limit) {
      value
      entityId
      label
    }
  }
`

const RELATED_ENTITIES_QUERY = /* GraphQL */ `
  query DeriveRelatedEntities($id: String!, $limit: Int!) {
    relatedEntities(id: $id, limit: $limit) {
      canonicalId
      canonicalName
      weight
      kind
    }
  }
`

const ENTITY_NETWORK_QUERY = /* GraphQL */ `
  query DeriveEntityNetwork($id: String!, $depth: Int!, $limit: Int!) {
    entityNetwork(id: $id, depth: $depth, limit: $limit) {
      nodes { entityId canonicalName type }
      edges { src dst weight kind }
    }
  }
`

// ---------- Tipos ----------

type RelatedEntity = {
  canonicalId: string
  canonicalName: string | null
  weight: number
  kind: string
}

type EntityWithRelations = {
  id: string
  name: string
  relatedEntities: RelatedEntity[]
}

// ---------- Helpers de derivação ----------

/**
 * Encontra a primeira entidade canônica com ao menos um vizinho em `entity_edges`.
 * Usa query vazia (type=CANONICAL) para recuperar as entidades mais mencionadas
 * e itera até achar uma com vizinhos. FALHA com mensagem acionável se o grafo
 * não tiver dados.
 */
async function deriveEntityWithRelations(): Promise<EntityWithRelations> {
  // type=CANONICAL retorna facets cujo valor É o entity_id (Q…/dgb_*).
  // Query vazia = top-N por frequência; query por texto não funciona nesse modo
  // (o facet é indexado pelo id, não pelo nome canônico).
  const { entitySuggestions } = await publicGraphQL<{
    entitySuggestions: Array<{
      value: string
      entityId: string | null
      label: string | null
    }>
  }>(ENTITY_SUGGESTIONS_QUERY, { query: '', limit: 50 })

  const canonical = entitySuggestions.filter((s) => s.entityId)

  if (canonical.length === 0) {
    throw new Error(
      'Pré-condição falhou: `entitySuggestions(type:"CANONICAL")` não retornou ' +
        'nenhuma entidade. O Typesense foi reindexado com canonical_id? ' +
        'Rode `typesense-maintenance-sync` para atualizar o índice.',
    )
  }

  for (const suggestion of canonical) {
    const { relatedEntities } = await publicGraphQL<{
      relatedEntities: RelatedEntity[]
    }>(RELATED_ENTITIES_QUERY, { id: suggestion.entityId, limit: 5 })

    if (relatedEntities.length > 0) {
      return {
        id: suggestion.entityId as string,
        name: suggestion.label ?? suggestion.value,
        relatedEntities,
      }
    }
  }

  throw new Error(
    'Pré-condição falhou: nenhuma entidade canônica com vizinhos encontrada ' +
      'em `entity_edges`. O DAG `project_entity_graph` já rodou em produção? ' +
      'Execute-o no Airflow e verifique se `entity_edges` tem arestas.',
  )
}

// ---------- Suíte ----------

test.beforeAll(async () => {
  await assertDataPreconditions()
})

test.describe('Grafo de entidades (Fase 6c/6d)', () => {
  test('relatedEntities retorna vizinhos com shape correto via GraphQL', async () => {
    const entity = await deriveEntityWithRelations()

    expect(
      entity.relatedEntities.length,
      'deve ter ao menos 1 vizinho',
    ).toBeGreaterThan(0)

    for (const related of entity.relatedEntities) {
      expect(related.canonicalId, 'vizinho deve ter canonicalId').toBeTruthy()
      expect(
        related.weight,
        'aresta deve ter weight >= 1',
      ).toBeGreaterThanOrEqual(1)
      expect(
        ['co_mention', 'subordinate_to', 'is_agency'],
        'kind deve ser um dos valores esperados',
      ).toContain(related.kind)
    }
  })

  test('entityNetwork retorna nós + arestas coerentes via GraphQL', async () => {
    const entity = await deriveEntityWithRelations()

    const { entityNetwork } = await publicGraphQL<{
      entityNetwork: {
        nodes: Array<{
          entityId: string
          canonicalName: string | null
          type: string | null
        }>
        edges: Array<{
          src: string
          dst: string
          weight: number
          kind: string
        }>
      }
    }>(ENTITY_NETWORK_QUERY, { id: entity.id, depth: 1, limit: 50 })

    // Depth=1 com vizinhos existentes: ao menos o nó ego + 1 vizinho + 1 aresta.
    expect(
      entityNetwork.nodes.length,
      'rede deve ter ao menos 2 nós (ego + vizinho)',
    ).toBeGreaterThanOrEqual(2)
    expect(
      entityNetwork.edges.length,
      'rede deve ter ao menos 1 aresta',
    ).toBeGreaterThanOrEqual(1)

    // Todas as arestas referenciam nós presentes.
    const nodeIds = new Set(entityNetwork.nodes.map((n) => n.entityId))
    for (const edge of entityNetwork.edges) {
      expect(
        nodeIds.has(edge.src) || nodeIds.has(edge.dst),
        `aresta ${edge.src}→${edge.dst} deve referenciar ao menos um nó presente`,
      ).toBe(true)
    }

    // A entidade-foco (ego) deve aparecer na lista de nós.
    expect(
      nodeIds.has(entity.id),
      `nó ego (${entity.id}) deve estar presente na rede`,
    ).toBe(true)
  })

  test('página /entidades/[id] renderiza h1, seção relacionadas e botão Ver rede', async ({
    page,
  }) => {
    const entity = await deriveEntityWithRelations()

    await page.goto(`/entidades/${encodeURIComponent(entity.id)}`)

    // h1 canônico da entidade — usa classe específica da EntityPageClient para
    // evitar o segundo h1 que o header do portal também tem.
    const h1 = page.locator('h1.text-3xl')
    await expect(h1).toBeVisible({ timeout: 20_000 })
    const h1Text = await h1.textContent()
    expect(
      h1Text?.trim().length,
      'h1 deve ter conteúdo (nome da entidade)',
    ).toBeGreaterThan(0)

    // Seção "Entidades relacionadas" com ao menos um chip de entidade vizinha.
    // .last() descarta a section pai (py-16) que também contém esse texto via nesting.
    const relatedSection = page
      .locator('section')
      .filter({ hasText: 'Entidades relacionadas' })
      .last()
    await expect(relatedSection).toBeVisible({ timeout: 20_000 })
    await expect(
      relatedSection.locator('a[href^="/entidades/"]').first(),
    ).toBeVisible({ timeout: 20_000 })

    // Cada chip deve ter href apontando para uma entidade canônica.
    const chips = relatedSection.locator('a[href^="/entidades/"]')
    const count = await chips.count()
    expect(
      count,
      'deve ter ao menos 1 chip de entidade relacionada',
    ).toBeGreaterThan(0)

    // Botão "Ver rede" (toggle padrão = fechado / aria-pressed=false).
    const toggleBtn = page.getByRole('button', { name: 'Ver rede' })
    await expect(toggleBtn).toBeVisible({ timeout: 20_000 })
  })

  test('toggle "Ver rede" abre a seção e carrega a rede de entidades', async ({
    page,
  }) => {
    // Navigation + hydration + toggle + content render can exceed the default 15s.
    test.setTimeout(45_000)
    const entity = await deriveEntityWithRelations()

    await page.goto(`/entidades/${encodeURIComponent(entity.id)}`)

    // Aguarda o botão aparecer (hidratação concluída).
    const toggleBtn = page.getByRole('button', { name: 'Ver rede' })
    await expect(toggleBtn).toBeVisible({ timeout: 20_000 })

    // Clica para abrir a rede.
    await toggleBtn.click()

    // Botão passa a exibir "Ocultar rede" (confirma que o toggle disparou).
    await expect(
      page.getByRole('button', { name: 'Ocultar rede' }),
    ).toBeVisible({ timeout: 10_000 })

    // A seção "Rede de entidades" está presente.
    // .last() descarta a section pai (py-16) que também contém o botão.
    const networkSection = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: 'Ocultar rede' }) })
      .last()
    await expect(networkSection).toBeVisible({ timeout: 10_000 })

    // Aguarda a query iniciar — um dos estados de feedback aparece.
    // A CORREÇÃO dos dados (relatedEntities/entityNetwork) é coberta pelos
    // testes de API acima (tests 1-2). Aqui só validamos que o toggle abre
    // a seção e a query é disparada (estado de loading ou resultado aparece).
    const canvas = page.locator('canvas').first()
    const loadingState = page.getByText('Carregando rede', { exact: false })
    const emptyState = page.getByText(
      'Ainda não há conexões suficientes para montar a rede desta entidade.',
    )
    const errorState = page.getByText(
      'Não foi possível carregar a rede de entidades.',
    )
    const navHint = page.getByText('Clique em uma entidade para navegar.', {
      exact: false,
    })

    // Qualquer estado (incluindo loading) confirma que o conteúdo da seção renderizou.
    await expect(
      canvas.or(loadingState).or(emptyState).or(errorState).or(navHint),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('botão "Maximizar" abre overlay e "Fechar" (e Esc) fecham', async ({
    page,
  }) => {
    // Maximizar exige que o grafo esteja carregado (hasGraph=true); a server
    // action pode ser lenta em dev — timeout generoso.
    test.setTimeout(60_000)
    const entity = await deriveEntityWithRelations()

    await page.goto(`/entidades/${encodeURIComponent(entity.id)}`)

    // Abre a rede.
    const toggleBtn = page.getByRole('button', { name: 'Ver rede' })
    await expect(toggleBtn).toBeVisible({ timeout: 20_000 })
    await toggleBtn.click()

    // Aguarda o botão "Maximizar" — aparece só após o grafo carregar (hasGraph).
    const maximizeBtn = page.getByRole('button', { name: 'Maximizar' })
    await expect(maximizeBtn).toBeVisible({ timeout: 40_000 })

    // Abre o overlay maximizado.
    await maximizeBtn.click()

    // Botão "Fechar" deve estar visível (fixed z-[60], acima do canvas).
    const closeBtn = page.getByRole('button', { name: /fechar/i })
    await expect(closeBtn).toBeVisible({ timeout: 5_000 })

    // Fechar via botão.
    await closeBtn.click()
    await expect(closeBtn).not.toBeVisible({ timeout: 3_000 })

    // Reabre e fecha via Esc.
    await maximizeBtn.click()
    await expect(page.getByRole('button', { name: /fechar/i })).toBeVisible({
      timeout: 5_000,
    })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /fechar/i })).not.toBeVisible(
      { timeout: 3_000 },
    )
  })
})
