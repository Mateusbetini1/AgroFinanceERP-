'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PageSpinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, isAuthenticated, companyId } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (!companyId && pathname !== '/company-select') {
      router.replace('/company-select')
    }
  }, [companyId, isAuthenticated, isLoading, pathname, router])

  if (isLoading || !isAuthenticated || !companyId) return <PageSpinner />

  return <>{children}</>
}
