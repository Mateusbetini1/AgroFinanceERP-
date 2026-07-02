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

  return (
    <DataTable
      columns={columns}
      data={products}
      getRowKey={(product) => product.id}
      mobileCard={(product) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{product.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatUnit(product.unit)}
                {product.category?.name ? ` · ${product.category.name}` : ''}
              </p>
            </div>
            <Badge variant={product.active ? 'success' : 'muted'}>
              {formatStatusLabel(product.active ? 'ACTIVE' : 'INACTIVE')}
            </Badge>
          </div>

          <RowActions
            onEdit={() => onEdit(product)}
            onDelete={() => onDelete(product)}
            isDeleting={deletingId === product.id}
          />
        </div>
      )}
    />
  )
}
