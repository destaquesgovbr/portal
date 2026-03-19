'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type WaitlistFormData, waitlistFormSchema } from '@/types/invite'

interface WaitlistFormProps {
  onSubmitAction?: (
    formData: FormData,
  ) => Promise<{ state: string; error?: unknown }>
}

export function WaitlistForm({ onSubmitAction }: WaitlistFormProps = {}) {
  const [isPending, setIsPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistFormSchema),
  })

  async function onSubmit(data: WaitlistFormData) {
    setIsPending(true)
    try {
      const formData = new FormData()
      formData.append('email', data.email)
      if (data.name) formData.append('name', data.name)

      if (onSubmitAction) {
        const result = await onSubmitAction(formData)
        if (result.state === 'success') {
          toast.success('Email adicionado à lista de espera!')
          reset()
        } else if (result.state === 'error') {
          toast.error(result.error as string)
        }
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome (opcional)</Label>
        <Input id="name" placeholder="Seu nome" {...register('name')} />
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isPending}>
        <Mail className="h-4 w-4" />
        {isPending ? 'Enviando...' : 'Entrar na lista de espera'}
      </Button>
    </form>
  )
}
