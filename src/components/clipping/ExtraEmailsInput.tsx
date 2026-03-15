'use client'

import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const MAX_EXTRA_EMAILS = 3

type Props = {
  emails: string[]
  onChange: (emails: string[]) => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function ExtraEmailsInput({ emails, onChange }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addEmail = useCallback(() => {
    const trimmed = input.trim().toLowerCase()
    setError(null)

    if (!trimmed) return

    if (!isValidEmail(trimmed)) {
      setError('Email inválido')
      return
    }

    if (emails.includes(trimmed)) {
      setError('Email já adicionado')
      return
    }

    if (emails.length >= MAX_EXTRA_EMAILS) {
      setError(`Máximo de ${MAX_EXTRA_EMAILS} emails extras`)
      return
    }

    onChange([...emails, trimmed])
    setInput('')
  }, [input, emails, onChange])

  const removeEmail = useCallback(
    (email: string) => {
      onChange(emails.filter((e) => e !== email))
    },
    [emails, onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addEmail()
      }
    },
    [addEmail],
  )

  return (
    <div className="space-y-2 pl-7">
      <p className="text-xs text-muted-foreground">
        Adicione até {MAX_EXTRA_EMAILS} emails extras para receber cópia do
        clipping.
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="email@exemplo.gov.br"
          disabled={emails.length >= MAX_EXTRA_EMAILS}
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEmail}
          disabled={!input.trim() || emails.length >= MAX_EXTRA_EMAILS}
          className="shrink-0 cursor-pointer"
        >
          Adicionar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <Badge
              key={email}
              className="inline-flex items-center gap-1 pr-1 bg-muted"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remover ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground self-center">
            {emails.length}/{MAX_EXTRA_EMAILS}
          </span>
        </div>
      )}
    </div>
  )
}
