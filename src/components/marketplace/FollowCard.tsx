'use client'

import {
  Bell,
  Clock,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  UserMinus,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { RecorteEstimationBadge } from '@/components/clipping/RecorteEstimationBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cronToHumanReadable } from '@/lib/cron-utils'
import type { DeliveryChannels, MarketplaceListing } from '@/types/clipping'
import { FollowDialog } from './FollowDialog'

export type FollowedListing = {
  listingId: string
  listing: MarketplaceListing
  deliveryChannels: DeliveryChannels
  extraEmails: string[]
  webhookUrl: string
  followedAt: string
}

type Props = {
  follow: FollowedListing
  hasTelegram: boolean
}

export function FollowCard({ follow, hasTelegram }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [unfollowing, setUnfollowing] = useState(false)

  const { listing, deliveryChannels } = follow

  const handleUnfollow = async () => {
    setUnfollowing(true)
    try {
      const res = await fetch(
        `/api/clippings/public/${follow.listingId}/follow`,
        { method: 'DELETE' },
      )

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao deixar de seguir')
      }

      toast.success('Você deixou de seguir este clipping')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao deixar de seguir',
      )
    } finally {
      setUnfollowing(false)
    }
  }

  const handleEdited = () => {
    router.refresh()
  }

  return (
    <>
      <Card className="flex flex-col">
        {listing.coverImageUrl && (
          <div className="relative aspect-[1200/630] overflow-hidden rounded-t-lg">
            <img
              src={listing.coverImageUrl}
              alt={listing.name}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold leading-tight">
            <Link
              href={`/clippings/${follow.listingId}`}
              className="hover:underline"
            >
              {listing.name}
            </Link>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Por {listing.authorDisplayName}
          </p>
          {listing.schedule && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              {cronToHumanReadable(listing.schedule)}
            </p>
          )}
          <RecorteEstimationBadge recortes={listing.recortes} />
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-1.5">
            {deliveryChannels.email && (
              <Badge className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Mail className="h-3 w-3" />
                Email
              </Badge>
            )}
            {deliveryChannels.telegram && (
              <Badge className="gap-1 text-xs bg-sky-50 text-sky-700 border-sky-200">
                <MessageCircle className="h-3 w-3" />
                Telegram
              </Badge>
            )}
            {deliveryChannels.push && (
              <Badge className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                <Bell className="h-3 w-3" />
                Push
              </Badge>
            )}
            {deliveryChannels.webhook && (
              <Badge className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Globe className="h-3 w-3" />
                Webhook
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center gap-2 mt-auto pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="cursor-pointer text-xs"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar entrega
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnfollow}
            disabled={unfollowing}
            className="cursor-pointer text-xs text-destructive hover:text-destructive"
          >
            {unfollowing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <UserMinus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Deixar de seguir
          </Button>
        </CardFooter>
      </Card>

      <FollowDialog
        listingId={follow.listingId}
        listingName={listing.name}
        open={editOpen}
        onOpenChange={setEditOpen}
        onFollowed={handleEdited}
        hasTelegram={hasTelegram}
        initialChannels={deliveryChannels}
        initialExtraEmails={follow.extraEmails}
        initialWebhookUrl={follow.webhookUrl}
        isEditing
      />
    </>
  )
}
