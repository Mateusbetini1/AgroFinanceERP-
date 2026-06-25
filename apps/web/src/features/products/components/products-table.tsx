import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatStatusLabel, formatUnit } from '@/lib/utils'
import type { Product } from '@/types/api'

const columns: DataTableColumn<Product>[] = [
  { header: 'Nome', cell: (product) => <span className="font-medium">{product.name}</span> },
  { header: 'Categoria', cell: (product) => product.category?.name ?? '-' },
  { header: 'Unidade', cell: (product) => formatUnit(product.unit) },
  { header: 'Preço padrão', cell: () => '-' },
  {
    header: 'Status',
    cell: (product) => (
      <Badge variant={product.active ? 'success' : 'muted'}>{formatStatusLabel(product.active ? 'ACTIVE' : 'INACTIVE')}</Badge>
    ),
  },
]

export function ProductsTable({ products }: { products: Product[] }) {
  return <DataTable columns={columns} data={products} getRowKey={(product) => product.id} />
}
