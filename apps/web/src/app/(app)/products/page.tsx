'use client'

import { useQuery } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { listProducts } from '@/features/products/api'
import { ProductsTable } from '@/features/products/components/products-table'

export default function ProductsPage() {
  const query = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const products = query.data?.data ?? []

  return (
    <ListPage
      title="Produtos"
      description="Produtos agrícolas usados em receitas, safras e relatórios."
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={products.length === 0}
      onRetry={() => void query.refetch()}
    >
      <ProductsTable products={products} />
    </ListPage>
  )
}
