'use client'

import { Check, Copy, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InviteCode } from '@/types/invite'

interface InviteListProps {
  codes: InviteCode[]
  onRevoke?: (code: string) => Promise<void>
}

const statusLabels: Record<InviteCode['status'], string> = {
  active: 'Ativo',
  used: 'Usado',
  revoked: 'Revogado',
}

const statusClasses: Record<InviteCode['status'], string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  used: 'bg-gray-100 text-gray-600 border-gray-200',
  revoked: 'bg-red-100 text-red-800 border-red-200',
}

export function InviteList({ codes, onRevoke }: InviteListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/convite/${code}`
    await navigator.clipboard.writeText(url)
    setCopiedCode(code)
    toast.success('Link copiado!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (codes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Você ainda não gerou nenhum convite.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {codes.map((invite) => (
        <div
          key={invite.code}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <code className="text-sm font-mono">{invite.code}</code>
            <Badge className={statusClasses[invite.status]}>
              {statusLabels[invite.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {invite.status === 'active' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(invite.code)}
                  title="Copiar link"
                >
                  {copiedCode === invite.code ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {onRevoke && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRevoke(invite.code)}
                    title="Revogar"
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
