'use client'

import { LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InviteCodeInput() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    router.push(`/convite/${trimmed}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código de convite"
        className="flex-1"
        required
      />
      <Button type="submit" className="gap-2">
        <LogIn className="h-4 w-4" />
        Entrar
      </Button>
    </form>
  )
}
