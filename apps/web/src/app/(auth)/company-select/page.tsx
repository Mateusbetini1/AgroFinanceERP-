'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'

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
        <CardTitle>Selecionar empresa</CardTitle>
        <CardDescription>Escolha a empresa que deseja acessar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {memberships.map((membership) => (
          <Button
            key={membership.company.id}
            variant="outline"
            className="h-auto w-full justify-start gap-3 py-3"
            onClick={() => {
              selectMembership(membership)
              router.push('/dashboard')
            }}
          >
            <Building2 className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <p className="font-medium">{membership.company.name}</p>
              <p className="text-xs text-muted-foreground">{membership.role}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
