import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoggedInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')
  // Token Keycloak expirado e não renovável (refresh token também morto): a
  // sessão NextAuth ainda existe, mas toda chamada autenticada ao graphql-api
  // falharia com UNAUTHENTICATED. Força re-login em vez de servir páginas quebradas.
  if (session.error === 'RefreshAccessTokenError') {
    redirect('/api/auth/signin?error=SessionExpired')
  }
  return <>{children}</>
}
