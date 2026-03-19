import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoggedInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')
  return <>{children}</>
}
