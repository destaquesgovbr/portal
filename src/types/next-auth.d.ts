import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      roles: string[]
    }
    /** Access token (JWT Keycloak) para chamadas autenticadas ao graphql-api. */
    accessToken?: string
    /** Erro de refresh do token (ex: 'RefreshAccessTokenError') — força re-login. */
    error?: string
  }

  interface User {
    roles?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roles?: string[]
    stableUserId?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    provider?: string
    error?: string
  }
}
