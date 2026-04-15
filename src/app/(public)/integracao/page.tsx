import {
  ArrowLeft,
  Braces,
  Github,
  MessageCircle,
  Network,
  Plug,
  Rocket,
} from 'lucide-react'
import Link from 'next/link'
import { LandingSection } from '@/components/landing/LandingSection'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Integração — DestaquesGovBr',
  description:
    'Acesso programático ao DestaquesGovBr: API GraphQL, servidor MCP e chat conversacional para desenvolvedores, agentes de IA e sistemas externos.',
  openGraph: {
    title: 'Integração — DestaquesGovBr',
    description:
      'API GraphQL, servidor MCP e chat conversacional para conectar qualquer sistema ao acervo do governo federal.',
    type: 'website',
  },
}

const STATUS_STYLES: Record<string, string> = {
  'em desenvolvimento': 'bg-amber-50 text-amber-700 border-amber-200',
  'em breve': 'bg-violet-50 text-violet-700 border-violet-200',
  disponível: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function StatusPill({ status }: { status: keyof typeof STATUS_STYLES }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

export default function IntegracaoPage() {
  return (
    <main>
      {/* Hero */}
      <LandingSection>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a home
        </Link>
        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          Para devs e agentes
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
          Integrações programáticas
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          O DestaquesGovBr oferece três formas de acesso programático ao acervo
          do governo federal: uma API GraphQL tipada, um servidor MCP nativo
          para LLMs e um chat conversacional com agente especializado. Todas as
          três camadas compartilham a mesma base de dados — 500k+ notícias
          indexadas, enriquecidas e classificadas.
        </p>
      </LandingSection>

      {/* GraphQL */}
      <LandingSection variant="muted" id="graphql">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-700 flex-shrink-0">
            <Braces className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight">API GraphQL</h2>
              <StatusPill status="em desenvolvimento" />
            </div>
            <p className="mt-2 text-muted-foreground">
              Uma interface única tipada para consultar e configurar tudo no
              DGB.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">O que resolve</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hoje o portal consome dezenas de rotas REST fragmentadas. A API
              GraphQL substitui tudo por um schema único, com auto-documentação,
              playground interativo e codegen TypeScript para o frontend.
              Workers e DAGs externos passam a ter uma superfície de consulta
              padronizada.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">Modelo de autenticação</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Duas camadas: <strong>JWT</strong> para usuários autenticados do
              portal (via Gov.Br OIDC ou Google OAuth) e{' '}
              <strong>OIDC de service account</strong> para workers, DAGs e
              integrações internas. Queries públicas de catálogo permanecem sem
              auth.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-background p-5">
          <h3 className="font-semibold mb-3">Superfície planejada</h3>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">Queries</p>
              <ul className="space-y-1 text-muted-foreground list-disc ml-5">
                <li>
                  <code className="text-xs">articles</code>,{' '}
                  <code className="text-xs">search</code>,{' '}
                  <code className="text-xs">searchSuggestions</code>
                </li>
                <li>
                  <code className="text-xs">themes</code>,{' '}
                  <code className="text-xs">agencies</code>,{' '}
                  <code className="text-xs">popularTags</code>
                </li>
                <li>
                  <code className="text-xs">analyticsKpis</code>,{' '}
                  <code className="text-xs">topThemes</code>,{' '}
                  <code className="text-xs">articlesTimeline</code>
                </li>
                <li>
                  <code className="text-xs">clippings</code>,{' '}
                  <code className="text-xs">marketplaceListings</code>,{' '}
                  <code className="text-xs">clippingEstimate</code>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Mutations</p>
              <ul className="space-y-1 text-muted-foreground list-disc ml-5">
                <li>
                  CRUD de clippings:{' '}
                  <code className="text-xs">createClipping</code>,{' '}
                  <code className="text-xs">updateClipping</code>,{' '}
                  <code className="text-xs">deleteClipping</code>
                </li>
                <li>
                  Marketplace:{' '}
                  <code className="text-xs">publishToMarketplace</code>,{' '}
                  <code className="text-xs">likeMarketplaceListing</code>,{' '}
                  <code className="text-xs">followMarketplaceListing</code>
                </li>
                <li>
                  Notifications:{' '}
                  <code className="text-xs">syncPushSubscription</code>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a
              href="https://github.com/destaquesgovbr/graphql-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              Ver repositório
            </a>
          </Button>
          <Button variant="ghost" disabled>
            <Rocket className="h-4 w-4" />
            Playground (em breve)
          </Button>
        </div>
      </LandingSection>

      {/* MCP */}
      <LandingSection id="mcp">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-700 flex-shrink-0">
            <Network className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight">
                Servidor MCP
              </h2>
              <StatusPill status="em breve" />
            </div>
            <p className="mt-2 text-muted-foreground">
              Model Context Protocol para integração nativa com Claude Desktop,
              ChatGPT e agentes customizados.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">O que é MCP</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Model Context Protocol é um padrão aberto para conectar
              assistentes de IA a fontes de dados e ferramentas. Um servidor MCP
              expõe <em>tools</em> (ações), <em>prompts</em> (templates guiados)
              e <em>resources</em> (leitura direta), e o cliente LLM descobre
              tudo automaticamente. Sem glue code, sem APIs customizadas — o
              agente fala direto com o DGB.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">Tools disponíveis</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc ml-5">
              <li>
                <code className="text-xs">search_news</code> — busca textual +
                semântica com filtros
              </li>
              <li>
                <code className="text-xs">get_facets</code> — agregações por
                agência, ano, tema, categoria
              </li>
              <li>
                <code className="text-xs">similar_news</code> — artigos
                similares a um dado artigo
              </li>
              <li>
                <code className="text-xs">analyze_temporal</code> — análise
                temporal (yearly/monthly/weekly)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-background p-5">
          <h3 className="font-semibold mb-2">Prompts guiados</h3>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            O servidor também oferece prompts prontos para análises comuns,
            acessíveis diretamente no menu do Claude Desktop:
          </p>
          <div className="flex flex-wrap gap-2">
            <code className="rounded border border-border bg-muted/50 px-2 py-1 text-xs">
              analyze_theme
            </code>
            <code className="rounded border border-border bg-muted/50 px-2 py-1 text-xs">
              compare_agencies
            </code>
            <code className="rounded border border-border bg-muted/50 px-2 py-1 text-xs">
              temporal_evolution
            </code>
            <code className="rounded border border-border bg-muted/50 px-2 py-1 text-xs">
              discover_context
            </code>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a
              href="https://github.com/destaquesgovbr/govbrnews-mcp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              Ver repositório
            </a>
          </Button>
        </div>
      </LandingSection>

      {/* Chat */}
      <LandingSection variant="muted" id="chat">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-700 flex-shrink-0">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight">
                Chat conversacional
              </h2>
              <StatusPill status="em breve" />
            </div>
            <p className="mt-2 text-muted-foreground">
              Agente de IA especializado em análise da comunicação
              governamental, fundamentado no acervo do DGB.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">Como vai funcionar</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Uma interface conversacional dentro do próprio portal, com um
              agente pré-configurado que já conhece o acervo, a árvore temática,
              as agências e os padrões de publicação. Por baixo, o agente usa o
              servidor MCP para consultar dados e renderizar visualizações — o
              usuário só precisa fazer perguntas em linguagem natural.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-5">
            <h3 className="font-semibold mb-2">Casos de uso</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc ml-5">
              <li>
                "Compare o volume de publicações do MMA e do ICMBio nos últimos
                3 meses"
              </li>
              <li>
                "Quais temas mais cresceram na comunicação do MEC desde
                janeiro?"
              </li>
              <li>
                "Me mostre as notícias mais relevantes sobre reforma agrária
                desta semana"
              </li>
              <li>
                "Há alguma convergência narrativa entre saúde e economia no
                último mês?"
              </li>
            </ul>
          </div>
        </div>
      </LandingSection>

      {/* CTA */}
      <LandingSection variant="primary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Quer construir algo em cima do DGB?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Se você está desenvolvendo um sistema dentro de um órgão, montando
            um agente para análise da comunicação governamental ou explorando
            como conectar o DGB ao seu workflow, fale com a gente. Ajudamos a
            mapear o melhor caminho.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <a href="mailto:contato@destaquesgov.br?subject=Integra%C3%A7%C3%A3o%20t%C3%A9cnica%20DGB">
                <Plug className="h-4 w-4" />
                Falar com a equipe técnica
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Voltar para a home</Link>
            </Button>
          </div>
        </div>
      </LandingSection>
    </main>
  )
}
