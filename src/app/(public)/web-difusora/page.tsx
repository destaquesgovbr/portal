import {
  ArrowLeft,
  Bell,
  LayoutGrid,
  Newspaper,
  Rss,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { CalloutAnnotation } from '@/components/landing/CalloutAnnotation'
import { LandingSection } from '@/components/landing/LandingSection'
import { ShowcaseMockup } from '@/components/landing/ShowcaseMockup'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Web Difusora — Como seu portal fica com o DGB — DestaquesGovBr',
  description:
    'Demonstração visual de como um portal governamental genérico fica após adotar o pacote de ferramentas do DestaquesGovBr.',
  openGraph: {
    title: 'Web Difusora — DestaquesGovBr',
    description:
      'Como um portal governamental genérico fica após adotar o pacote DGB.',
    type: 'website',
  },
}

export default function WebDifusoraPage() {
  return (
    <main>
      {/* Header */}
      <LandingSection>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a home
        </Link>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Demonstração visual
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
          Web Difusora: o portal do seu órgão em modo amplificado
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Esta é uma demonstração visual de como um portal governamental
          genérico fica após adotar o pacote de ferramentas do DGB. Os elementos
          em cor são o que o DGB adiciona — tudo ao redor é o portal do seu
          órgão, preservado como está.
        </p>
      </LandingSection>

      {/* Mockup */}
      <LandingSection variant="muted">
        <ShowcaseMockup />
      </LandingSection>

      {/* Callouts */}
      <LandingSection>
        <div className="max-w-3xl mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            Cada elemento tem um papel
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Os números na tela acima correspondem às ferramentas descritas
            abaixo. Você pode adotar qualquer uma isoladamente ou combiná-las
            para uma experiência completa.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div id="callout-1" className="scroll-mt-24">
            <CalloutAnnotation
              number={1}
              icon={<Search className="h-5 w-5" />}
              title="Barra de Busca Inteligente"
              description="Busca semântica com RAG, autocomplete e preview. Pode ser filtrada para buscar apenas no acervo do seu órgão, oferecendo ao cidadão uma experiência muito superior à busca textual tradicional dos portais gov.br."
            />
          </div>
          <div id="callout-2" className="scroll-mt-24">
            <CalloutAnnotation
              number={2}
              icon={<Bell className="h-5 w-5" />}
              title="WebPush — o sininho de alertas"
              description="Cidadãos se inscrevem em um clique e recebem notificações em tempo real no navegador quando seu órgão publica uma nova notícia. Sem aplicativo, sem cadastro — apenas permissão do browser."
            />
          </div>
          <div id="callout-3" className="scroll-mt-24">
            <CalloutAnnotation
              number={3}
              icon={<LayoutGrid className="h-5 w-5" />}
              title="Widget de notícias"
              description="Um bloco configurável de notícias embutido no seu portal via iframe. Escolha layout (lista, grade, carrossel), filtros (órgãos, temas), identidade visual e número de itens — e cole o código gerado no HTML do seu portal."
            />
          </div>
          <div id="callout-4" className="scroll-mt-24">
            <CalloutAnnotation
              number={4}
              icon={<Newspaper className="h-5 w-5" />}
              title="Galeria de Clippings Temáticos"
              description="Clippings públicos curados pelo seu órgão (ou pela comunidade) exibidos como galeria no portal. Cada clipping vira uma página pública navegável, com edições históricas, filtros e resumo editorial — tudo automático."
            />
          </div>
          <div id="callout-5" className="scroll-mt-24 md:col-span-2">
            <CalloutAnnotation
              number={5}
              icon={<Rss className="h-5 w-5" />}
              title="Feeds RSS, Atom e JSON"
              description="Feeds padronizados por órgão, tema ou clipping. Cidadãos, jornalistas e integradores podem assinar o que importa para eles. Um padrão maduro e subutilizado nos portais governamentais atuais."
            />
          </div>
        </div>
      </LandingSection>

      {/* CTA */}
      <LandingSection variant="primary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Pronto para trazer isso para o seu portal?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Fale com a equipe do DestaquesGovBr e vamos conversar sobre como os
            componentes se encaixam no portal do seu órgão.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <a href="mailto:contato@destaquesgov.br?subject=Interesse%20no%20pacote%20Web%20Difusora">
                Falar com a equipe
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
