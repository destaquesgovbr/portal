import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUserInvites } from './actions'
import { ConvitesClient } from './client'

export default async function ConvitesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/convite')
  }

  const result = await getUserInvites()

  if (result.type !== 'ok') {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Erro ao carregar convites.</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-2xl">
      <ConvitesClient initialData={result.data} />
    </main>
  )
}
