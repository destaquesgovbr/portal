'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InviteStats {
  totalInvites: number
  activeInvites: number
  usedInvites: number
  pendingWaitlist: number
  approvedWaitlist: number
}

export function InviteStatsCards({ stats }: { stats: InviteStats }) {
  const items = [
    { label: 'Convites Gerados', value: stats.totalInvites },
    { label: 'Convites Ativos', value: stats.activeInvites },
    { label: 'Convites Usados', value: stats.usedInvites },
    { label: 'Waitlist Pendente', value: stats.pendingWaitlist },
    { label: 'Waitlist Aprovada', value: stats.approvedWaitlist },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
