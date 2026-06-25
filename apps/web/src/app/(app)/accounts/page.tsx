'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listAccounts } from '@/features/accounts/api'
import { AccountsTable } from '@/features/accounts/components/accounts-table'

export default function AccountsPage() {
  const query = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const accounts = query.data?.data ?? []

  return (
    <ListPage
      title="Contas"
      description="Saldos operacionais e contas financeiras cadastradas."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={accounts.length === 0}
      onRetry={() => void query.refetch()}
    >
      <AccountsTable accounts={accounts} />
    </ListPage>
  )
}
