import { auth } from '@/auth'

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user) return false

  // 1. Keycloak realm role (ou Firestore role via JWT)
  if (session.user.roles?.includes('admin')) return true

  // 2. Fallback: env var (para dev local sem Keycloak/Firestore)
  if (!session.user.email) return false
  const adminEmails = getAdminEmails()
  return adminEmails.includes(session.user.email)
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('Unauthorized')
}
