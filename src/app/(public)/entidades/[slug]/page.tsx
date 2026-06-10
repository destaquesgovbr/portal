import { deslugifyEntity } from '@/lib/entity-slug'
import { resolveEntity } from './actions'
import EntityPageClient from './EntityPageClient'

type EntityPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: EntityPageProps) {
  const { slug } = await params
  const resolved = await resolveEntity(slug)
  const name = resolved?.text ?? deslugifyEntity(slug)

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
  const resolved = await resolveEntity(slug)

  return (
    <EntityPageClient
      entityText={resolved?.text ?? ''}
      slugLabel={deslugifyEntity(slug)}
      initialCount={resolved?.count ?? null}
    />
  )
}
