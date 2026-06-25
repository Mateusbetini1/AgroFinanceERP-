'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, title, description, onClose, children, className }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className={cn('w-full max-w-2xl rounded-lg border bg-card shadow-lg', className)}>
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
