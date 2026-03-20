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
  userFollowsId: string | null
  userHasLiked: boolean
}

export function ListingActions({
  listing,
  userFollowsId: initialFollowsId,
  userHasLiked: initialHasLiked,
}: Props) {
  const { data: session } = useSession()
  const router = useRouter()

  const [liked, setLiked] = useState(initialHasLiked)
  const [likeCount, setLikeCount] = useState(listing.likeCount)
  const [liking, setLiking] = useState(false)

  const [followsId, setFollowsId] = useState(initialFollowsId)
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
      const res = await fetch(`/api/marketplace/${listing.id}/like`, {
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

    if (followsId) {
      handleUnfollow()
    } else {
      setFollowDialogOpen(true)
    }
  }

  const handleUnfollow = async () => {
    setUnfollowing(true)

    try {
      const res = await fetch(`/api/marketplace/${listing.id}/follow`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao deixar de seguir')
      }

      setFollowsId(null)
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
    setFollowsId('new')
    setFollowerCount((prev) => prev + 1)
    router.refresh()
  }

  const handleClone = async () => {
    if (requireAuth()) return
    setCloning(true)

    try {
      const res = await fetch(`/api/marketplace/${listing.id}/clone`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao clonar')
      }

      const body = await res.json()
      toast.success('Clipping clonado com sucesso!', {
        action: {
          label: 'Editar',
          onClick: () => router.push(`/minha-conta/clipping/${body.id}/editar`),
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao clonar')
    } finally {
      setCloning(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={liked ? 'default' : 'outline'}
          size="sm"
          onClick={handleLike}
          disabled={liking}
          className="cursor-pointer"
        >
          {liking ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Heart
              className={`h-4 w-4 mr-1.5 ${liked ? 'fill-current' : ''}`}
            />
          )}
          {likeCount}
        </Button>

        <Button
          variant={followsId ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleFollowClick}
          disabled={unfollowing}
          className="cursor-pointer"
        >
          {unfollowing ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : followsId ? (
            <UserCheck className="h-4 w-4 mr-1.5" />
          ) : (
            <UserPlus className="h-4 w-4 mr-1.5" />
          )}
          {followsId ? 'Seguindo' : 'Seguir'}
          <span className="ml-1 text-muted-foreground">{followerCount}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClone}
          disabled={cloning}
          className="cursor-pointer"
        >
          {cloning ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Copy className="h-4 w-4 mr-1.5" />
          )}
          Clonar
        </Button>
      </div>

      <FollowDialog
        listingId={listing.id}
        listingName={listing.name}
        open={followDialogOpen}
        onOpenChange={setFollowDialogOpen}
        onFollowed={handleFollowed}
      />
    </>
  )
}
