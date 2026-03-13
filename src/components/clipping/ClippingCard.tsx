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
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  const [sendError, setSendError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hasChannels =
    clipping.deliveryChannels.email ||
    clipping.deliveryChannels.telegram ||
    clipping.deliveryChannels.push

  const canSend = clipping.active && hasChannels && sendStatus !== 'loading'

  const handleSend = async () => {
    setSendStatus('loading')
    try {
      await onSend(clipping.id)
      setSendStatus('success')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro desconhecido')
      setSendStatus('error')
    }
  }

  const handleStatusButtonClick = () => {
    if (sendStatus === 'success') {
      setSendStatus('idle')
    } else if (sendStatus === 'error') {
      setShowErrorDialog(true)
    }
  }

  const isPostSend = sendStatus === 'success' || sendStatus === 'error'

  return (
    <>
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

          {isPostSend ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStatusButtonClick}
              className={`h-8 w-8 cursor-pointer ${
                sendStatus === 'success'
                  ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  : 'text-destructive hover:text-destructive hover:bg-destructive/10'
              }`}
            >
              {sendStatus === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <DropdownMenu
              onOpenChange={(open) => !open && setConfirmDelete(false)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 cursor-pointer ${sendStatus === 'loading' ? 'text-[#1351b4]' : ''}`}
                >
                  {sendStatus === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
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
                  <Send className="h-4 w-4" />
                  Enviar Agora
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
          )}
        </CardFooter>
      </Card>

      <AlertDialog
        open={showErrorDialog}
        onOpenChange={(open) => {
          setShowErrorDialog(open)
          if (!open) setSendStatus('idle')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erro ao enviar clipping</AlertDialogTitle>
            <AlertDialogDescription>
              {sendError ??
                'Ocorreu um erro inesperado ao tentar enviar o clipping.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
