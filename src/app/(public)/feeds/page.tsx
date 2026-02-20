import type { Metadata } from 'next'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy, getTopLevelThemes } from '@/data/themes-utils'
import FeedsPageClient from './FeedsPageClient'

export const metadata: Metadata = {
  title: 'Feeds RSS / Atom / JSON — Destaques GOV.BR',
  description:
    'Assine os feeds de notícias do portal Destaques GOV.BR. RSS, Atom e JSON Feed disponíveis para todos os órgãos e temas.',
}

export default async function FeedsPage() {
  const [agencies, themes, topLevelThemes] = await Promise.all([
    getAgenciesList(),
    getThemesWithHierarchy(),
    getTopLevelThemes(),
  ])

  const topThemes = topLevelThemes.map((t) => ({
    key: t.code,
    name: t.label,
  }))

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl font-bold text-primary">Feeds de Notícias</h2>
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>
        <p className="mt-4 text-base text-primary/80 max-w-2xl mx-auto">
          Assine os feeds de notícias do Destaques GOV.BR no seu leitor
          favorito. Disponível nos formatos RSS 2.0, Atom 1.0 e JSON Feed 1.1.
        </p>
      </div>

      <div className="container mx-auto px-4">
        <FeedsPageClient
          agencies={agencies}
          themes={themes}
          topThemes={topThemes}
        />
      </div>
    </section>
  )
}
