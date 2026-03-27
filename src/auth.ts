import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

const providers = []

// Dev-only: login com email fixo (sem OAuth)
if (process.env.AUTH_DEV_LOGIN === 'true') {
  providers.push(
    Credentials({
      id: 'dev-login',
      name: 'Dev Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        if (!email) return null
        return {
          id: email,
          email,
          name: email.split('@')[0],
          roles: ['admin'],
        }
      },
    }),
  )
}

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
    profile(profile: Record<string, unknown>) {
      return {
        id: profile.sub as string,
        name: profile.name as string,
        email: profile.email as string,
        roles: (profile.realm_roles as string[]) ?? [],
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
        // Dynamic import to avoid pulling firebase-admin into edge runtime (middleware)
        const email = token.email ?? profile?.email
        if (email) {
          const { resolveStableUser } = await import(
            '@/lib/resolve-stable-user-id'
          )
          const { userId, role } = await resolveStableUser(
            email as string,
            token.sub ?? '',
          )
          token.stableUserId = userId

          // Roles: Keycloak realm_roles tem prioridade, Firestore role é fallback
          const keycloakRoles = (profile as Record<string, unknown>)
            ?.realm_roles as string[] | undefined
          if (keycloakRoles?.length) {
            token.roles = keycloakRoles
          } else if (role === 'admin') {
            token.roles = ['admin']
          } else {
            token.roles = []
          }
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
      session.user.roles = (token.roles as string[]) ?? []
      return session
    },
  },
})

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
