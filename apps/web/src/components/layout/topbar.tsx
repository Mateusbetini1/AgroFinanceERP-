'use client'

import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { membership, user, logout } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Abrir menu"
          onClick={onOpenMobileMenu}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{membership?.company.name ?? 'AgroFinance'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </header>
  )
}
