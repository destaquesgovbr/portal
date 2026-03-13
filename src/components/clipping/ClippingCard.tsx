'use client'

import {
  Bell,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  MoreVertical,
  Pencil,
  Power,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const sendIcon = {
    idle: <Send className="h-4 w-4" />,
    loading: <Loader2 className="h-4 w-4 animate-spin" />,
    success: <Check className="h-4 w-4 text-green-600" />,
    error: <Send className="h-4 w-4 text-destructive" />,
  }

  const sendLabel = {
    idle: 'Enviar Agora',
    loading: 'Enviando...',
    success: 'Enviado!',
    error: 'Erro ao enviar',
  }

  const menuButtonColor =
    sendStatus === 'success'
      ? 'text-green-600'
      : sendStatus === 'error'
        ? 'text-destructive'
        : sendStatus === 'loading'
          ? 'text-[#1351b4]'
          : ''

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

      <CardFooter className="flex items-center justify-between mt-auto pt-3">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="cursor-pointer text-xs"
        >
          <Link href={`/minha-conta/clipping/${clipping.id}/editar`}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 cursor-pointer ${menuButtonColor}`}
            >
              {sendStatus !== 'idle' ? (
                sendIcon[sendStatus]
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={handleSend}
              disabled={!canSend}
              className="cursor-pointer gap-2"
            >
              {sendIcon[sendStatus]}
              {sendLabel[sendStatus]}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onToggleActive(clipping.id, !clipping.active)}
              className="cursor-pointer gap-2"
            >
              <Power className="h-4 w-4" />
              {clipping.active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {confirmDelete ? (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    onDelete(clipping.id)
                    setConfirmDelete(false)
                  }}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Confirmar exclusão
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(false)}
                  className="cursor-pointer gap-2"
                >
                  Cancelar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}
