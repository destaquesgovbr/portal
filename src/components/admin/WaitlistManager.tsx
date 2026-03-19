'use client'

import { Check, Copy, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { approveEntry, rejectEntry } from '@/app/(admin)/admin/convites/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { WaitlistEntry } from '@/types/invite'

interface WaitlistManagerProps {
  entries: WaitlistEntry[]
}

const statusLabels: Record<WaitlistEntry['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const statusClasses: Record<WaitlistEntry['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export function WaitlistManager({ entries }: WaitlistManagerProps) {
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  async function handleApprove(id: string) {
    const result = await approveEntry(id)
    if (result.type === 'ok') {
      toast.success(`Aprovado! Código: ${result.data}`)
      router.refresh()
    } else {
      toast.error('Erro ao aprovar')
    }
  }

  async function handleReject(id: string) {
    const result = await rejectEntry(id)
    if (result.type === 'ok') {
      toast.success('Rejeitado')
      router.refresh()
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Código copiado!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const pending = entries.filter((e) => e.status === 'pending')
  const approved = entries.filter((e) => e.status === 'approved')
  const rejected = entries.filter((e) => e.status === 'rejected')

  function renderEntries(list: WaitlistEntry[]) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma entrada.
        </p>
      )
    }

    return (
      <div className="space-y-2">
        {list.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.email}</span>
                <Badge className={statusClasses[entry.status]}>
                  {statusLabels[entry.status]}
                </Badge>
              </div>
              {entry.name && (
                <span className="text-sm text-muted-foreground">
                  {entry.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(entry.submittedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {entry.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(entry.id)}
                    className="gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Aprovar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReject(entry.id)}
                    className="gap-1 text-destructive"
                  >
                    <X className="h-3 w-3" />
                    Rejeitar
                  </Button>
                </>
              )}
              {entry.inviteCodeSent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(entry.inviteCodeSent!)}
                  className="gap-1"
                >
                  {copiedCode === entry.inviteCodeSent ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {entry.inviteCodeSent}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
        <TabsTrigger value="approved">
          Aprovados ({approved.length})
        </TabsTrigger>
        <TabsTrigger value="rejected">
          Rejeitados ({rejected.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending">{renderEntries(pending)}</TabsContent>
      <TabsContent value="approved">{renderEntries(approved)}</TabsContent>
      <TabsContent value="rejected">{renderEntries(rejected)}</TabsContent>
    </Tabs>
  )
}
