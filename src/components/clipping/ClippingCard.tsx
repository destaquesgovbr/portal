'use client'

import {
  Bell,
  Check,
  ExternalLink,
  Globe,
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
import { toast } from 'sonner'
import { PublishDialog } from '@/components/marketplace/PublishDialog'
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
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cronToHumanReadable } from '@/lib/cron-utils'
import type { Clipping } from '@/types/clipping'

type SendStatus = 'idle' | 'loading' | 'success' | 'error'

type Props = {
  clipping: Clipping
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
  onSend: (id: string) => Promise<void>
  onUnpublished?: () => void
  themeMap?: Record<string, string>
  agencyMap?: Record<string, string>
}

export function ClippingCard({
  clipping,
  onDelete,
  onToggleActive,
  onSend,
  onUnpublished,
  themeMap = {},
  agencyMap = {},
}: Props) {
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendError, setSendError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  const isPublished =
    clipping.publishedToMarketplace && clipping.marketplaceListingId

  const channels = clipping.deliveryChannels ?? {}
  const hasChannels = channels.email || channels.telegram || channels.push

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

  const handleUnpublish = async () => {
    if (!clipping.marketplaceListingId) return
    setIsUnpublishing(true)

    try {
      const res = await fetch(
        `/api/clippings/public/${clipping.marketplaceListingId}`,
        { method: 'DELETE' },
      )

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao despublicar')
      }

      toast.success('Clipping removido do marketplace')
      setConfirmUnpublish(false)
      onUnpublished?.()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Erro ao despublicar do marketplace',
      )
    } finally {
      setIsUnpublishing(false)
    }
  }

  const isPostSend = sendStatus === 'success' || sendStatus === 'error'

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow"
        data-testid="clipping-card"
      >
        <div className="flex items-start gap-3 p-4">
          <Link
            href={`/minha-conta/clipping/${clipping.id}`}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold leading-tight">
                {clipping.name}
              </span>
              {!clipping.active && (
                <Badge className="text-xs bg-muted text-muted-foreground">
                  Inativo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {clipping.schedule
                  ? cronToHumanReadable(clipping.schedule)
                  : clipping.scheduleTime
                    ? `Todos os dias às ${clipping.scheduleTime}`
                    : ''}
              </span>
              {channels.email && (
                <Badge className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <Mail className="h-3 w-3" />
                  Email
                </Badge>
              )}
              {channels.telegram && (
                <Badge className="gap-1 text-xs bg-sky-50 text-sky-700 border-sky-200">
                  <MessageCircle className="h-3 w-3" />
                  Telegram
                </Badge>
              )}
              {channels.push && (
                <Badge className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Bell className="h-3 w-3" />
                  Push
                </Badge>
              )}
              {channels.webhook && (
                <Badge className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <Globe className="h-3 w-3" />
                  Webhook
                </Badge>
              )}
            </div>
          </Link>
          <div className="shrink-0 flex flex-col items-center justify-between self-stretch">
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
                onOpenChange={(open) => {
                  if (!open) {
                    setConfirmDelete(false)
                    setConfirmUnpublish(false)
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 cursor-pointer ${sendStatus === 'loading' ? 'text-primary' : ''}`}
                  >
                    {sendStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href={`/minha-conta/clipping/${clipping.id}/editar`}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleSend}
                    disabled={!canSend}
                    className="cursor-pointer gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Gerar e Enviar Agora
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() =>
                      onToggleActive(clipping.id, !clipping.active)
                    }
                    className="cursor-pointer gap-2"
                  >
                    <Power className="h-4 w-4" />
                    {clipping.active ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Marketplace actions */}
                  {!isPublished && (
                    <DropdownMenuItem
                      onSelect={() => setPublishDialogOpen(true)}
                      className="cursor-pointer gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Publicar no Marketplace
                    </DropdownMenuItem>
                  )}

                  {isPublished && (
                    <>
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer gap-2"
                      >
                        <Link
                          href={`/clippings/${clipping.marketplaceListingId}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver no Marketplace
                        </Link>
                      </DropdownMenuItem>

                      {confirmUnpublish ? (
                        <>
                          <DropdownMenuItem
                            onSelect={() => {
                              handleUnpublish()
                            }}
                            disabled={isUnpublishing}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            {isUnpublishing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )}
                            Confirmar despublicação
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setConfirmUnpublish(false)
                            }}
                            className="cursor-pointer gap-2"
                          >
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            setConfirmUnpublish(true)
                          }}
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Globe className="h-4 w-4" />
                          Despublicar
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {!isPublished && <DropdownMenuSeparator />}
                  {isPublished && <DropdownMenuSeparator />}

                  {confirmDelete ? (
                    <>
                      <DropdownMenuItem
                        onSelect={() => {
                          onDelete(clipping.id)
                          setConfirmDelete(false)
                        }}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Confirmar exclusão
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setConfirmDelete(false)
                        }}
                        className="cursor-pointer gap-2"
                      >
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setConfirmDelete(true)
                      }}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isPublished && (
              <Link
                href={`/clippings/${clipping.marketplaceListingId}`}
                title="Ver página pública"
              >
                <Globe className="h-4 w-4 text-indigo-400 hover:text-indigo-600 transition-colors" />
              </Link>
            )}
          </div>
        </div>
      </Card>

      <PublishDialog
        clipping={clipping}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        themeMap={themeMap}
        agencyMap={agencyMap}
        onPublished={onUnpublished ?? (() => {})}
      />

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
