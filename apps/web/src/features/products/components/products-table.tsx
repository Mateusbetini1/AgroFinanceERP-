import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatStatusLabel, formatUnit } from '@/lib/utils'
import type { Product } from '@/types/api'

export function ProductsTable({
  products,
  deletingId,
  onEdit,
  onDelete,
}: {
  products: Product[]
  deletingId?: string | null
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  const columns: DataTableColumn<Product>[] = [
    { header: 'Nome', cell: (product) => <span className="font-medium">{product.name}</span> },
    { header: 'Categoria', cell: (product) => product.category?.name ?? '-' },
    { header: 'Unidade', cell: (product) => formatUnit(product.unit) },
    { header: 'Preço padrão', cell: () => '-' },
    {
      header: 'Status',
      cell: (product) => (
        <Badge variant={product.active ? 'success' : 'muted'}>
          {formatStatusLabel(product.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (product) => (
        <RowActions
          onEdit={() => onEdit(product)}
          onDelete={() => onDelete(product)}
          isDeleting={deletingId === product.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={products} getRowKey={(product) => product.id} />
}
