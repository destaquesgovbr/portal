'use client'

import { Copy, Heart, Loader2, UserCheck, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { MarketplaceListing } from '@/types/clipping'
import { FollowDialog } from './FollowDialog'

type Props = {
  listing: MarketplaceListing
  userFollows: boolean
  userHasLiked: boolean
  hasTelegram: boolean
}

export function ListingActions({
  listing,
  userFollows: initialFollows,
  userHasLiked: initialHasLiked,
  hasTelegram,
}: Props) {
  const { data: session } = useSession()
  const router = useRouter()

  const [liked, setLiked] = useState(initialHasLiked)
  const [likeCount, setLikeCount] = useState(listing.likeCount)
  const [liking, setLiking] = useState(false)

  const [follows, setFollows] = useState(initialFollows)
  const [followerCount, setFollowerCount] = useState(listing.followerCount)
  const [followDialogOpen, setFollowDialogOpen] = useState(false)
  const [unfollowing, setUnfollowing] = useState(false)

  const [cloning, setCloning] = useState(false)

  const requireAuth = () => {
    if (!session?.user) {
      router.push('/api/auth/signin')
      return true
    }
    return false
  }

  const handleLike = async () => {
    if (requireAuth()) return
    setLiking(true)

    try {
      const res = await fetch(`/api/clippings/public/${listing.id}/like`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao curtir')
      }

      const body = await res.json()
      setLiked(body.liked)
      setLikeCount(body.likeCount)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao curtir')
    } finally {
      setLiking(false)
    }
  }

  const handleFollowClick = () => {
    if (requireAuth()) return

    if (follows) {
      handleUnfollow()
    } else {
      setFollowDialogOpen(true)
    }
  }

  const handleUnfollow = async () => {
    setUnfollowing(true)

    try {
      const res = await fetch(`/api/clippings/public/${listing.id}/follow`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao deixar de seguir')
      }

      setFollows(false)
      setFollowerCount((prev) => Math.max(0, prev - 1))
      toast.success('Você deixou de seguir este clipping')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao deixar de seguir',
      )
    } finally {
      setUnfollowing(false)
    }
  }

  const handleFollowed = () => {
    setFollows(true)
    setFollowerCount((prev) => prev + 1)
    router.refresh()
  }

  const handleClone = async () => {
    if (requireAuth()) return
    setCloning(true)

    try {
      const res = await fetch(`/api/clippings/public/${listing.id}/clone`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao clonar')
      }

      const body = await res.json()
      router.push(`/minha-conta/clipping/${body.id}/editar`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao clonar')
    } finally {
      setCloning(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Like — GitHub style: button + count badge */}
        <div className="inline-flex items-center rounded-md border border-input overflow-hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={liking}
            className={`rounded-none gap-1.5 ${
              liked
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-background hover:bg-accent'
            }`}
          >
            {liking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            )}
            Curtir
          </Button>
          <span className="border-l border-input px-2.5 py-1.5 text-sm text-muted-foreground bg-muted/30 tabular-nums">
            {likeCount}
          </span>
        </div>

        {/* Follow — GitHub style */}
        <div className="inline-flex items-center rounded-md border border-input overflow-hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFollowClick}
            disabled={unfollowing}
            className={`rounded-none gap-1.5 ${
              follows
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-background hover:bg-accent'
            }`}
          >
            {unfollowing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : follows ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {follows ? 'Seguindo' : 'Seguir'}
          </Button>
          <span className="border-l border-input px-2.5 py-1.5 text-sm text-muted-foreground bg-muted/30 tabular-nums">
            {followerCount}
          </span>
        </div>

        {/* Clone — GitHub style */}
        <div className="inline-flex items-center rounded-md border border-input overflow-hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClone}
            disabled={cloning}
            className="rounded-none gap-1.5 bg-background hover:bg-accent"
          >
            {cloning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Clonar
          </Button>
          <span className="border-l border-input px-2.5 py-1.5 text-sm text-muted-foreground bg-muted/30 tabular-nums">
            {listing.cloneCount}
          </span>
        </div>
      </div>

      <FollowDialog
        listingId={listing.id}
        listingName={listing.name}
        open={followDialogOpen}
        onOpenChange={setFollowDialogOpen}
        onFollowed={handleFollowed}
        hasTelegram={hasTelegram}
      />
    </>
  )
}
