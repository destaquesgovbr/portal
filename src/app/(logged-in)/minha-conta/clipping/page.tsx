import Link from 'next/link'
import { ClippingListClient } from './ClippingListClient'

async function getClippings() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/clipping`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ClippingPage() {
  const clippings = await getClippings()

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Meus Clippings</h1>
        <Link
          href="/minha-conta/clipping/novo"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Novo Clipping
        </Link>
      </div>

      <ClippingListClient initialClippings={clippings} />
    </main>
  )
}
