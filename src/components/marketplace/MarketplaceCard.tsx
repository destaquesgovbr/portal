'use client'

import { Copy, Heart, Users } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { MarketplaceListing } from '@/types/clipping'

type Props = {
  listing: MarketplaceListing
}

export function MarketplaceCard({ listing }: Props) {
  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold leading-tight">
            {listing.name}
          </CardTitle>
          {listing.description && (
            <CardDescription className="line-clamp-2">
              {listing.description}
            </CardDescription>
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

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
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
