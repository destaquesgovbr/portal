import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Widget DGB',
  description: 'Widget embarcável do Destaques Gov.br',
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Layout minimalista para widgets embarcáveis
 * Sem Header, Footer, Providers ou componentes de navegação
 * O root layout já fornece HTML e body básicos
 */
export default function WidgetEmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
