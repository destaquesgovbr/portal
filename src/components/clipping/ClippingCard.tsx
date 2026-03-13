'use client'

import {
  Bell,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Clipping } from '@/types/clipping'

type SendStatus = 'idle' | 'loading' | 'success' | 'error'

type Props = {
  clipping: Clipping
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
  onSend: (id: string) => Promise<void>
}

export function ClippingCard({
  clipping,
  onDelete,
  onToggleActive,
  onSend,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')

  const hasChannels =
    clipping.deliveryChannels.email ||
    clipping.deliveryChannels.telegram ||
    clipping.deliveryChannels.push

  const canSend = clipping.active && hasChannels && sendStatus !== 'loading'

  useEffect(() => {
    if (sendStatus === 'success' || sendStatus === 'error') {
      const timer = setTimeout(() => setSendStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [sendStatus])

  const handleSend = async () => {
    setSendStatus('loading')
    try {
      await onSend(clipping.id)
      setSendStatus('success')
    } catch {
      setSendStatus('error')
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {clipping.name}
          </CardTitle>
          <Badge
            className={`shrink-0 text-xs ${
              clipping.active
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {clipping.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Envio diário às {clipping.scheduleTime}
        </p>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {clipping.deliveryChannels.email && (
            <Badge className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
              <Mail className="h-3 w-3" />
              Email
            </Badge>
          )}
          {clipping.deliveryChannels.telegram && (
            <Badge className="gap-1 text-xs bg-sky-50 text-sky-700 border-sky-200">
              <MessageCircle className="h-3 w-3" />
              Telegram
            </Badge>
          )}
          {clipping.deliveryChannels.push && (
            <Badge className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
              <Bell className="h-3 w-3" />
              Push
            </Badge>
          )}
          {!clipping.deliveryChannels.email &&
            !clipping.deliveryChannels.telegram &&
            !clipping.deliveryChannels.push && (
              <span className="text-xs text-muted-foreground">
                Nenhum canal ativo
              </span>
            )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 mt-auto pt-3">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(clipping.id, !clipping.active)}
            className="text-xs cursor-pointer"
          >
            {clipping.active ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={!canSend}
            className="text-xs cursor-pointer"
          >
            {sendStatus === 'loading' && (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Enviando...
              </>
            )}
            {sendStatus === 'success' && (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Enviado!
              </>
            )}
            {sendStatus === 'error' && 'Erro'}
            {sendStatus === 'idle' && (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Enviar Agora
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="cursor-pointer"
          >
            <Link href={`/minha-conta/clipping/${clipping.id}/editar`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Link>
          </Button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(clipping.id)
                  setConfirmDelete(false)
                }}
                className="cursor-pointer text-xs"
              >
                Confirmar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="cursor-pointer text-xs"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
