import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getReleaseById } from './actions'
import { ReleasePageClient } from './ReleasePageClient'

type Props = {
  params: Promise<{ releaseId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { releaseId } = await params
  const release = await getReleaseById(releaseId)

  if (!release) {
    return { title: 'Release n\u00e3o encontrada' }
  }

  // Extract first ~160 chars of intro for description
  let description = ''
  try {
    const parsed = JSON.parse(release.digest)
    description = parsed.intro?.slice(0, 160) ?? ''
  } catch {
    description = release.digest.slice(0, 160)
  }

  return {
    title: `Clipping: ${release.clippingName}`,
    description,
    openGraph: {
      title: `Clipping: ${release.clippingName}`,
      description,
      type: 'article',
    },
  }
}

export default async function ReleasePage({ params }: Props) {
  const { releaseId } = await params
  const release = await getReleaseById(releaseId)

  if (!release) {
    notFound()
  }

  return <ReleasePageClient release={release} />
}
