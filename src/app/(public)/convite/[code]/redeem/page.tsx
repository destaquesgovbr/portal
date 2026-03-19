import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { redeemInviteCode } from '../actions'

interface Props {
  params: Promise<{ code: string }>
}

export default async function RedeemPage({ params }: Props) {
  const session = await auth()

  if (!session?.user?.id) {
    const { code } = await params
    redirect(`/convite/${code}`)
  }

  const { code } = await params
  const result = await redeemInviteCode(code)

  if (result.type === 'ok') {
    redirect('/')
  }

  // If redeem failed, redirect back to the invite page
  redirect(`/convite/${code}`)
}
