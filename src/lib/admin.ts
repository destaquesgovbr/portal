import { auth } from '@/auth'

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) return false
  const adminEmails = getAdminEmails()
  return adminEmails.includes(session.user.email)
}

export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin()
  if (!admin) throw new Error('Unauthorized')
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email)
}
