'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listSuppliers } from '@/features/suppliers/api'
import { SuppliersTable } from '@/features/suppliers/components/suppliers-table'

export default function SuppliersPage() {
  const query = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const suppliers = query.data?.data ?? []

  return (
    <ListPage
      title="Fornecedores"
      description="Fornecedores usados em despesas, boletos e relatórios."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={suppliers.length === 0}
      onRetry={() => void query.refetch()}
    >
      <SuppliersTable suppliers={suppliers} />
    </ListPage>
  )
}
