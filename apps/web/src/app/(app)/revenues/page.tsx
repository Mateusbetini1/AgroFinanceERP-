'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listRevenues } from '@/features/revenues/api'
import { RevenuesTable } from '@/features/revenues/components/revenues-table'

export default function RevenuesPage() {
  const query = useQuery({ queryKey: ['revenues'], queryFn: listRevenues })
  const revenues = query.data?.data ?? []

  return (
    <ListPage
      title="Receitas"
      description="Vendas e recebimentos cadastrados por produto."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={revenues.length === 0}
      onRetry={() => void query.refetch()}
    >
      <RevenuesTable revenues={revenues} />
    </ListPage>
  )
}
