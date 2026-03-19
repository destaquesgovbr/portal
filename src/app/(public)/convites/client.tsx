'use client'

import { useRouter } from 'next/navigation'
import { GenerateInviteButton } from '@/components/invite/GenerateInviteButton'
import { InviteList } from '@/components/invite/InviteList'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { InviteCode } from '@/types/invite'
import { createInviteCode, revokeInviteCode } from './actions'

interface ConvitesClientProps {
  initialData: {
    inviteCount: number
    maxInvites: number
    codes: InviteCode[]
  }
}

export function ConvitesClient({ initialData }: ConvitesClientProps) {
  const router = useRouter()

  async function handleRevoke(code: string) {
    const result = await revokeInviteCode(code)
    if (result.type === 'ok') {
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Meus Convites</CardTitle>
        <CardDescription>
          Compartilhe links de convite para que outras pessoas possam acessar o
          portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <GenerateInviteButton
          currentCount={initialData.inviteCount}
          maxInvites={initialData.maxInvites}
          onGenerate={createInviteCode}
          onSuccess={() => router.refresh()}
        />
        <InviteList codes={initialData.codes} onRevoke={handleRevoke} />
      </CardContent>
    </Card>
  )
}
