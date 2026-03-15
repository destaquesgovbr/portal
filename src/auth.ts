import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { getFirestoreDb } from '@/lib/firebase-admin'

const providers = []

// Google para desenvolvimento
if (process.env.AUTH_GOOGLE_ID) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  )
}

// Gov.Br para producao
if (process.env.AUTH_GOVBR_ID) {
  providers.push({
    id: 'govbr',
    name: 'Gov.Br',
    type: 'oidc' as const,
    clientId: process.env.AUTH_GOVBR_ID,
    clientSecret: process.env.AUTH_GOVBR_SECRET,
    issuer: process.env.AUTH_GOVBR_ISSUER,
    authorization: {
      params: {
        scope: 'openid email profile',
        // Pula a tela de login do Keycloak e vai direto ao IdP
        // Valor controlado por env: 'google' (agora) ou 'govbr' (produção futura)
        ...(process.env.AUTH_GOVBR_IDP_HINT && {
          kc_idp_hint: process.env.AUTH_GOVBR_IDP_HINT,
        }),
      },
    },
    profile(profile: Record<string, string>) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
      }
    },
  })
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.provider = account.provider

        // Resolve stable user ID based on email to avoid duplicates
        // across providers/deployments (token.sub changes, email doesn't)
        const email = token.email ?? profile?.email
        if (email) {
          token.stableUserId = await resolveStableUserId(
            email as string,
            token.sub ?? '',
          )
        }
      }

      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token
      }

      // Refresh apenas para Gov.Br — Google gerencia sessao por conta propria
      if (token.provider === 'govbr' && token.refreshToken) {
        return await refreshGovBrToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = (token.stableUserId as string) ?? token.sub ?? ''
      return session
    },
  },
})

/**
 * Resolve a stable user ID from Firestore based on email.
 * If a user doc with this email already exists, return its ID.
 * Otherwise, return the provider's sub as the new user ID.
 * This prevents duplicate user docs when the same email logs in
 * via different providers or deployments.
 */
async function resolveStableUserId(
  email: string,
  providerSub: string,
): Promise<string> {
  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      return snapshot.docs[0].id
    }
  } catch (error) {
    console.error('Failed to resolve stable user ID:', error)
  }
  return providerSub
}

async function refreshGovBrToken(token: Record<string, unknown>) {
  try {
    const issuer = process.env.AUTH_GOVBR_ISSUER!
    const wellKnown = await fetch(`${issuer}/.well-known/openid-configuration`)
    const { token_endpoint } = await wellKnown.json()

    const response = await fetch(token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOVBR_ID!,
        client_secret: process.env.AUTH_GOVBR_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshed = await response.json()
    if (!response.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}
