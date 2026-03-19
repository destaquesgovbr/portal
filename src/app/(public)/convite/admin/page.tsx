import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isAdmin } from '@/lib/admin'
import { AdminSignIn } from './client'

export default async function ConviteAdminPage() {
  const session = await auth()

  if (session?.user) {
    const admin = await isAdmin()
    if (admin) {
      redirect('/')
    }
    redirect('/convite')
  }

  return (
    <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <AdminSignIn />
    </main>
  )
}
