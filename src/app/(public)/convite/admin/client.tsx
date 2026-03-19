'use client'

import { LogIn } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AdminSignIn() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acesso Admin</CardTitle>
        <CardDescription>
          Login direto para administradores do portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button
          onClick={async () => {
            const res = await fetch('/api/auth/providers')
            const providers = await res.json()
            const providerId = Object.keys(providers)[0]
            signIn(providerId, { callbackUrl: '/convite/admin/callback' })
          }}
          size="lg"
          className="gap-2 w-full"
        >
          <LogIn className="h-5 w-5" />
          Entrar como Admin
        </Button>
      </CardContent>
    </Card>
  )
}
