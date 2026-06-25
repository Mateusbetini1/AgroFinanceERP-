'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listBills } from '@/features/bills/api'
import { BillsTable } from '@/features/bills/components/bills-table'

export default function BillsPage() {
  const query = useQuery({ queryKey: ['bills'], queryFn: listBills })
  const bills = query.data?.data ?? []

  return (
    <ListPage
      title="Boletos"
      description="Boletos pendentes, pagos e vencidos."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={bills.length === 0}
      onRetry={() => void query.refetch()}
    >
      <BillsTable bills={bills} />
    </ListPage>
  )
}
