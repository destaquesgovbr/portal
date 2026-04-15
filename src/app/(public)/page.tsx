import {
  Bell,
  BookOpen,
  Braces,
  Github,
  Hourglass,
  LayoutGrid,
  LineChart,
  MessageCircle,
  MessageSquare,
  Network,
  Newspaper,
  Plug,
  Puzzle,
  Radar,
  Radio,
  Rss,
  Search,
  Sparkles,
  VolumeX,
} from 'lucide-react'
import Link from 'next/link'
import { FeatureCard } from '@/components/landing/FeatureCard'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingSection } from '@/components/landing/LandingSection'
import { PainPointGrid } from '@/components/landing/PainPointGrid'
import { StatsBar } from '@/components/landing/StatsBar'
import { Button } from '@/components/ui/button'
import { getLandingStats } from '@/lib/landing-stats'

export const metadata = {
  title: 'DestaquesGovBr — A Web Difusora do governo federal',
  description:
    'Plataforma que fortalece a comunicação dos órgãos e entrega aos gestores um radar em tempo real sobre a agenda do governo.',
  openGraph: {
    title: 'DestaquesGovBr — A Web Difusora do governo federal',
    description:
      'Plataforma que amplifica a comunicação dos órgãos e acelera a inteligência de quem gere o serviço público.',
    type: 'website',
  },
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M+`
  if (n >= 1_000) return `${Math.floor(n / 1_000)}k+`
  return `${n}+`
}

export default async function Home() {
  const stats = await getLandingStats()

  return (
    <main>
      {/* ==== Hero ==== */}
      <LandingHero
        eyebrow="Para órgãos governamentais"
        title="A Web Difusora do governo federal"
        subtitle="Fortalecemos a comunicação do seu órgão com o cidadão, e entregamos aos gestores um radar em tempo real sobre a agenda do governo. Tudo como plataforma — o seu portal continua sendo o protagonista."
        primaryCta={{ label: 'Conhecer para meu órgão', href: '#solucao' }}
        secondaryCta={{
          label: 'Explorar notícias',
          href: '/noticias',
        }}
        visual={
          <div className="relative w-full max-w-md aspect-square">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
            <div className="absolute top-8 left-8 w-48 rounded-lg border border-border bg-card p-4 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Newspaper className="h-4 w-4" />
                Clipping
              </div>
              <div className="mt-2 h-2 w-full rounded bg-muted" />
              <div className="mt-1.5 h-2 w-4/5 rounded bg-muted" />
              <div className="mt-1.5 h-2 w-3/5 rounded bg-muted" />
            </div>
            <div className="absolute bottom-8 right-8 w-52 rounded-lg border border-border bg-card p-4 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <LineChart className="h-4 w-4" />
                Panorama Gov.BR
              </div>
              <div className="mt-3 flex items-end gap-1 h-12">
                <div
                  className="flex-1 rounded-sm bg-emerald-200"
                  style={{ height: '40%' }}
                />
                <div
                  className="flex-1 rounded-sm bg-emerald-300"
                  style={{ height: '65%' }}
                />
                <div
                  className="flex-1 rounded-sm bg-emerald-400"
                  style={{ height: '80%' }}
                />
                <div
                  className="flex-1 rounded-sm bg-emerald-500"
                  style={{ height: '55%' }}
                />
                <div
                  className="flex-1 rounded-sm bg-emerald-600"
                  style={{ height: '90%' }}
                />
              </div>
            </div>
            <div className="absolute top-1/2 right-12 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-lg">
              <Bell className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        }
      />

      {/* ==== Problema ==== */}
      <LandingSection variant="muted">
        <div className="max-w-3xl mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            O desafio de comunicar no serviço público hoje
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Produzir boas notícias e entregá-las ao público certo ainda depende
            de rotinas manuais: clippings montados à mão, planilhas que ninguém
            atualiza, screenshots no WhatsApp, e portais de órgãos com pouca
            capacidade de difusão. Do outro lado, ministros e secretários
            precisam de um panorama estratégico do que está sendo dito — sobre
            seu órgão, sobre o governo, sobre o país — e não têm tempo para
            reunir isso manualmente.
          </p>
        </div>
        <PainPointGrid
          items={[
            {
              icon: <Hourglass className="h-5 w-5" />,
              title: 'Clipping manual toma horas por dia',
              description:
                'E ainda assim fica incompleto, chega fora de hora ou precisa ser refeito a cada nova pauta.',
            },
            {
              icon: <VolumeX className="h-5 w-5" />,
              title: 'Portais com baixa difusão',
              description:
                'O conteúdo é produzido com qualidade, mas não chega onde precisa chegar — falta alcance e falta integração.',
            },
            {
              icon: <Puzzle className="h-5 w-5" />,
              title: 'Visão fragmentada do governo',
              description:
                'Cada gestor monta seu próprio painel à base de links, e-mails e conversas avulsas. Nada consolidado.',
            },
          ]}
        />
      </LandingSection>

      {/* ==== Solução em três fluxos ==== */}
      <LandingSection id="solucao">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Como resolvemos
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
            Três fluxos, uma plataforma
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            O DestaquesGovBr organiza tudo que seu órgão precisa em três
            direções complementares: <strong>Difusão</strong>, para levar sua
            comunicação ao cidadão, <strong>Inteligência</strong>, para trazer o
            que importa até quem decide, e <strong>Integração</strong>, para
            conectar o DGB a qualquer sistema ou agente que precise operar sobre
            a base do governo federal.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Difusão */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-transparent p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <Radio className="h-3 w-3" />
              Para ASCOMs
            </span>
            <h3 className="mt-4 text-2xl font-bold">
              Amplifique a voz do seu órgão
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              O DGB entrega um conjunto de componentes prontos para você
              embarcar no portal do seu órgão. Seus leitores ganham widgets de
              notícias, notificações em tempo real, feeds para quem quer
              integrar, uma barra de busca inteligente e uma galeria de
              clippings temáticos — sem que seu órgão precise desenvolver nada
              disso internamente.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <span>
                  <strong>Autonomia editorial:</strong> o órgão continua no
                  comando do conteúdo e da identidade visual
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <span>
                  <strong>Zero desenvolvimento:</strong> integração por embed,
                  feed ou link
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <span>
                  <strong>Transparência:</strong> o cidadão vê o conteúdo no
                  portal do órgão, não num terceiro
                </span>
              </li>
            </ul>
            <Button variant="outline" asChild className="mt-6">
              <Link href="#features">Ver as ferramentas de difusão</Link>
            </Button>
          </div>

          {/* Inteligência */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-transparent p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Radar className="h-3 w-3" />
              Para gestores
            </span>
            <h3 className="mt-4 text-2xl font-bold">
              Acompanhe a agenda do governo em tempo real
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Ministros, secretários, diretores e assessores têm acesso a
              clippings personalizados, entregues automaticamente por e-mail,
              Telegram ou push, cobrindo os temas e órgãos que importam para
              cada função. Para quem precisa de visão agregada, o Panorama
              oferece o recorte analítico da comunicação governamental das
              últimas semanas.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Monitore seu órgão e o governo</strong> com a mesma
                  ferramenta
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Clippings com resumo editorial</strong> feitos por IA,
                  não só listas de links
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Entrega no canal certo:</strong> e-mail, Telegram,
                  WebPush
                </span>
              </li>
            </ul>
            <Button variant="outline" asChild className="mt-6">
              <Link href="#features">Ver as ferramentas de inteligência</Link>
            </Button>
          </div>

          {/* Integração */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-transparent p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Plug className="h-3 w-3" />
              Para devs e agentes
            </span>
            <h3 className="mt-4 text-2xl font-bold">
              Conecte qualquer sistema à base do DGB
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Desenvolvedores de órgãos, pesquisadores, jornalistas e aplicações
              agênticas têm acesso programático completo ao DGB. Consultem
              notícias, operem sobre recortes temáticos, busquem semanticamente
              no acervo, acompanhem tendências — via API GraphQL tipada,
              servidor MCP nativo para LLMs ou chat conversacional com agente
              especializado.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                <span>
                  <strong>API GraphQL tipada:</strong> uma interface única para
                  consulta e configuração, com codegen TypeScript
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                <span>
                  <strong>MCP nativo:</strong> aplicações com Claude, ChatGPT ou
                  agentes customizados se conectam sem glue code
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                <span>
                  <strong>Chat especializado:</strong> converse com um agente
                  que já conhece o acervo e sabe analisar
                </span>
              </li>
            </ul>
            <Button variant="outline" asChild className="mt-6">
              <Link href="#features">Ver as ferramentas de integração</Link>
            </Button>
          </div>
        </div>
      </LandingSection>

      {/* ==== Features ==== */}
      <LandingSection variant="muted" id="features">
        <div className="max-w-3xl mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Um kit para cada necessidade
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Você pode adotar qualquer uma das ferramentas isoladamente, ou
            combiná-las para um portal governamental completo — o que chamamos
            de Web Difusora.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Newspaper className="h-5 w-5" />}
            title="Clipping"
            description="Monte recortes temáticos do governo federal com apoio de IA. Receba por e-mail, Telegram ou push — ou publique como página pública para compartilhar com cidadãos."
            flow="ambos"
            href="/clippings"
            linkLabel="Ver galeria de clippings"
          />
          <FeatureCard
            icon={<LayoutGrid className="h-5 w-5" />}
            title="Widget de notícias"
            description="Um bloco de notícias configurável para embutir no portal do seu órgão. Escolha layout, filtros e identidade visual."
            flow="difusao"
            href="/widgets/configurador"
            linkLabel="Configurar um widget"
          />
          <FeatureCard
            icon={<Bell className="h-5 w-5" />}
            title="WebPush"
            description="O sininho de notificações: cidadãos se inscrevem no portal do seu órgão e recebem alertas em tempo real sobre novas publicações."
            flow="difusao"
          />
          <FeatureCard
            icon={<Rss className="h-5 w-5" />}
            title="Feeds RSS/Atom/JSON"
            description="Feeds padronizados por órgão, tema ou clipping. Compatível com qualquer leitor de feeds ou integração de terceiros."
            flow="difusao"
            href="/feeds"
            linkLabel="Ver feeds disponíveis"
          />
          <FeatureCard
            icon={<Search className="h-5 w-5" />}
            title="Barra de Busca Inteligente"
            description="Busca semântica com RAG, autocomplete e preview de resultados. Pode ser filtrada para o acervo do seu órgão."
            flow="difusao"
            href="/busca"
            linkLabel="Testar a busca"
          />
          <FeatureCard
            icon={<LineChart className="h-5 w-5" />}
            title="Panorama Gov.BR"
            description="Dashboard analítico com temas emergentes, volume de publicações por órgão e tendências discursivas nas últimas semanas."
            flow="inteligencia"
            badge="experimental"
            href="https://streamlit-panorama-dgb-klvx64dufq-rj.a.run.app/"
            linkLabel="Abrir Panorama"
          />
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat com agente de análise"
            description="Converse com um agente de IA especializado em comunicação governamental. Peça análises temporais, comparações entre órgãos, cruzamentos temáticos — tudo em linguagem natural, com respostas fundamentadas no acervo."
            flow="integracao"
            badge="em breve"
            href="/integracao#chat"
            linkLabel="Ver documentação"
          />
          <FeatureCard
            icon={<Network className="h-5 w-5" />}
            title="Servidor MCP"
            description="Conecte Claude Desktop, ChatGPT ou qualquer aplicação agêntica ao DGB via Model Context Protocol. Acesso direto a busca, facets, análise temporal e artigos similares — com prompts guiados prontos para uso."
            flow="integracao"
            badge="em breve"
            href="/integracao#mcp"
            linkLabel="Ver documentação"
          />
          <FeatureCard
            icon={<Braces className="h-5 w-5" />}
            title="API GraphQL"
            description="Uma API tipada e unificada para consultar o acervo, configurar clippings, gerenciar marketplace e integrar sistemas externos. Substitui dezenas de rotas REST por um schema único, com codegen TypeScript e playground interativo."
            flow="integracao"
            badge="em breve"
            href="/integracao#graphql"
            linkLabel="Ver documentação"
          />
        </div>
      </LandingSection>

      {/* ==== Showcase teaser ==== */}
      <LandingSection>
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Demonstração visual
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Como seu portal fica com a Web Difusora
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Cada ferramenta foi pensada para se encaixar naturalmente no
              portal do seu órgão, respeitando sua identidade visual. Veja um
              exemplo de portal modelo com os componentes do DGB integrados.
            </p>
            <Button size="lg" asChild className="mt-6">
              <Link href="/web-difusora">Ver a demonstração completa</Link>
            </Button>
          </div>
        </div>
      </LandingSection>

      {/* ==== Em breve ==== */}
      <LandingSection variant="muted">
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Roadmap
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
            Em desenvolvimento
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Essas são as próximas entregas que estamos construindo. A plataforma
            evolui em conjunto com o feedback dos órgãos que já a utilizam.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Gerar notícia com IA</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              A partir de um clipping, gere um rascunho de notícia no tom e
              estilo do seu órgão. O clipping vira motor editorial, não apenas
              ferramenta de leitura.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Braces className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">API GraphQL pública</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Um único endpoint tipado para consultar tudo do DGB — notícias,
              temas, métricas, clippings — com schema documentado, playground
              interativo e codegen para TypeScript. Em desenvolvimento em ciclos
              de TDD.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Dashboard do Órgão</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Uma área logada com visão integrada da comunicação do seu órgão e
              do contexto governamental. Enquanto isso, experimente a versão
              preliminar no <strong>Panorama Gov.BR</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Network className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Ecossistema agêntico</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Servidor MCP para integração nativa com Claude, ChatGPT e agentes
              customizados, mais um chat conversacional com agente especializado
              em análise do acervo governamental. Pronto para a era dos agentes
              de IA.
            </p>
          </div>
        </div>
      </LandingSection>

      {/* ==== Prova ==== */}
      <LandingSection>
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Transparente por construção
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            O DestaquesGovBr é um projeto aberto, com código público, algoritmos
            documentados e dados estruturados disponíveis para consulta. Porque
            a confiança no serviço público começa na forma como ele é
            construído.
          </p>
        </div>
        <StatsBar
          items={[
            {
              value: formatCompact(stats.portalsCount),
              label: 'portais monitorados',
              href: '/orgaos',
            },
            {
              value: formatCompact(stats.newsCount),
              label: 'notícias indexadas',
              href: '/busca',
            },
            {
              value: formatCompact(stats.publicClippingsCount),
              label: 'clippings públicos ativos',
              href: '/clippings?sort=trending',
            },
            { value: '100%', label: 'código aberto' },
          ]}
        />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link
            href="/transparencia-algoritmica"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            Algoritmos documentados publicamente
          </Link>
          <span className="text-muted-foreground">•</span>
          <a
            href="https://github.com/destaquesgovbr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <Github className="h-4 w-4" />
            Código-fonte aberto no GitHub
          </a>
        </div>
      </LandingSection>

      {/* ==== CTA final ==== */}
      <LandingSection variant="primary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Vamos conversar sobre o seu órgão
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Se você faz parte de uma assessoria de comunicação, é gestor público
            ou simplesmente quer entender como o DGB pode se encaixar na rotina
            do seu órgão, fale com a gente.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <a href="mailto:contato@destaquesgov.br?subject=Interesse%20do%20meu%20%C3%B3rg%C3%A3o%20no%20DGB">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Falar com a equipe
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/destaquesgovbr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-1.5 h-4 w-4" />
                Ver no GitHub
              </a>
            </Button>
          </div>
        </div>
      </LandingSection>
    </main>
  )
}
