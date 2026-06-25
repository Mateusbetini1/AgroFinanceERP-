'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function Topbar() {
  const { membership, user, logout } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div>
        <p className="text-sm font-medium text-foreground">{membership?.company.name ?? 'AgroFinance'}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </header>
  )
}
