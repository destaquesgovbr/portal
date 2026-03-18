'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface GenerateInviteButtonProps {
  currentCount: number
  maxInvites: number
  onGenerate: () => Promise<{ type: string; data?: string; error?: unknown }>
  onSuccess?: () => void
}

export function GenerateInviteButton({
  currentCount,
  maxInvites,
  onGenerate,
  onSuccess,
}: GenerateInviteButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const unlimited = !Number.isFinite(maxInvites)
  const remaining = unlimited ? Infinity : maxInvites - currentCount
  const isDisabled = remaining <= 0 || isPending

  async function handleClick() {
    setIsPending(true)
    try {
      const result = await onGenerate()
      if (result.type === 'ok') {
        toast.success('Convite gerado!')
        onSuccess?.()
      } else if (result.type === 'err') {
        toast.error(result.error as string)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isDisabled} className="gap-2">
        <Plus className="h-4 w-4" />
        {isPending ? 'Gerando...' : 'Gerar Convite'}
      </Button>
      <span className="text-sm text-muted-foreground">
        {unlimited
          ? `${currentCount} gerados`
          : `${remaining} de ${maxInvites} restantes`}
      </span>
    </div>
  )
}
