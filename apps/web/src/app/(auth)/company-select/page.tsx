'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { PageSpinner } from '@/components/ui/spinner'

export default function CompanySelectPage() {
  const router = useRouter()
  const { memberships, isLoading, isAuthenticated, selectMembership } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
    if (!isLoading && isAuthenticated && memberships.length === 1) {
      selectMembership(memberships[0])
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, memberships, router, selectMembership])

  if (isLoading) return <PageSpinner />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecione a empresa</CardTitle>
        <CardDescription>Você tem acesso a múltiplas empresas. Escolha com qual deseja trabalhar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {memberships.map((m) => (
          <Button
            key={m.company.id}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => {
              selectMembership(m)
              router.push('/dashboard')
            }}
          >
            <Building2 className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <p className="font-medium">{m.company.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{m.role.toLowerCase()}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
