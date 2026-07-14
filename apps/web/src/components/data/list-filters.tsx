'use client'

import { Filter, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ListFilters({
  children,
  onClear,
  hasActiveFilters,
}: {
  children: ReactNode
  onClear: () => void
  hasActiveFilters: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Button type="button" variant="outline" className="w-full" onClick={() => setOpen((current) => !current)}>
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="icon" aria-label="Limpar filtros" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className={cn('mt-4 grid gap-3 md:mt-0 md:grid-cols-4 md:items-end', !open && 'hidden md:grid')}>
        {children}
        <Button type="button" variant="outline" onClick={onClear} disabled={!hasActiveFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  )
}
