import { deslugifyEntity, isCanonicalEntityId } from '@/lib/entity-slug'
import { resolveCanonicalEntity, resolveEntity } from './actions'
import EntityPageClient from './EntityPageClient'

type EntityPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: EntityPageProps) {
  const { slug } = await params

  // Caminho canônico (id `Q…`/`dgb_…`): resolve o nome via entity(id).
  // Caminho legado (texto): resolve o texto canônico via fuzzy-match.
  let name: string
  if (isCanonicalEntityId(slug)) {
    const node = await resolveCanonicalEntity(slug)
    name = node?.canonicalName ?? slug
  } else {
    const resolved = await resolveEntity(slug)
    name = resolved?.text ?? deslugifyEntity(slug)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const pageUrl = `${siteUrl}/entidades/${slug}`
  const title = `${name} — Notícias do Governo Federal | DestaquesGovBr`
  const description = `Acompanhe as notícias e publicações oficiais do Governo Federal que mencionam ${name}.`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'DestaquesGovBr',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { slug } = await params

  // Slug canônico → resolve o nó do registry e filtra por id canônico.
  if (isCanonicalEntityId(slug)) {
    const node = await resolveCanonicalEntity(slug)
    return (
      <EntityPageClient
        canonicalId={slug}
        entityText=""
        slugLabel={node?.canonicalName ?? slug}
        entityNode={node}
        initialCount={null}
      />
    )
  }

  // Slug legado (texto) → comportamento fuzzy-text preservado.
  const resolved = await resolveEntity(slug)
  return (
    <EntityPageClient
      canonicalId={null}
      entityText={resolved?.text ?? ''}
      slugLabel={deslugifyEntity(slug)}
      entityNode={null}
      initialCount={resolved?.count ?? null}
    />
  )
}
