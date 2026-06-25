'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listExpenses } from '@/features/expenses/api'
import { ExpensesTable } from '@/features/expenses/components/expenses-table'

export default function ExpensesPage() {
  const query = useQuery({ queryKey: ['expenses'], queryFn: listExpenses })
  const expenses = query.data?.data ?? []

  return (
    <ListPage
      title="Despesas"
      description="Despesas operacionais e financeiras lançadas."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={expenses.length === 0}
      onRetry={() => void query.refetch()}
    >
      <ExpensesTable expenses={expenses} />
    </ListPage>
  )
}
