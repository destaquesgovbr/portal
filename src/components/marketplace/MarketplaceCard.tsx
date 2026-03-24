'use client'

import { Check, Clock, Copy, Heart, Users } from 'lucide-react'
import Link from 'next/link'
import { RecorteEstimationBadge } from '@/components/clipping/RecorteEstimationBadge'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cronToHumanReadable } from '@/lib/cron-utils'
import type { MarketplaceListing } from '@/types/clipping'

type Props = {
  listing: MarketplaceListing
  isFollowing?: boolean
  isLiked?: boolean
}

export function MarketplaceCard({
  listing,
  isFollowing = false,
  isLiked = false,
}: Props) {
  return (
    <Link href={`/clippings/${listing.id}`}>
      <Card
        className={`flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer ${isFollowing ? 'ring-2 ring-primary/30' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">
              {listing.name}
            </CardTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              {isFollowing && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                  <Check className="h-3 w-3" />
                  Seguindo
                </Badge>
              )}
              {isLiked && (
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              )}
            </div>
          </div>
          {listing.description && (
            <CardDescription className="line-clamp-2">
              {listing.description}
            </CardDescription>
          )}
          {listing.schedule && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              {cronToHumanReadable(listing.schedule)}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3 mt-auto">
          {listing.recortes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.recortes.map((recorte) => (
                <Badge key={recorte.id} className="text-xs">
                  {recorte.title ?? `Recorte ${recorte.id.slice(0, 4)}`}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <RecorteEstimationBadge recortes={listing.recortes} />
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart
                className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
              />
              {listing.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {listing.followerCount}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="h-3.5 w-3.5" />
              {listing.cloneCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
