import { redirect } from 'next/navigation'
import { InviteStatsCards } from '@/components/admin/InviteStatsCards'
import { WaitlistManager } from '@/components/admin/WaitlistManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAdmin } from '@/lib/admin'
import { getInviteStats, getWaitlistEntries } from './actions'

export default async function AdminConvitesPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/')
  }

  const [statsResult, entriesResult] = await Promise.all([
    getInviteStats(),
    getWaitlistEntries(),
  ])

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Convites</h1>

      {statsResult.type === 'ok' && (
        <InviteStatsCards stats={statsResult.data} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Espera</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesResult.type === 'ok' ? (
            <WaitlistManager entries={entriesResult.data} />
          ) : (
            <p className="text-muted-foreground">
              Erro ao carregar lista de espera.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
