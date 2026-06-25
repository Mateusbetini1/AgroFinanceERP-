import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatStatusLabel } from '@/lib/utils'
import type { Category } from '@/types/api'

function categoryTypeLabel(type: Category['type']) {
  return type === 'EXPENSE' ? 'Despesa' : type === 'REVENUE' ? 'Receita' : 'Ambos'
}

export function CategoriesTable({
  categories,
  deletingId,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  deletingId?: string | null
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const columns: DataTableColumn<Category>[] = [
    { header: 'Nome', cell: (category) => <span className="font-medium">{category.name}</span> },
    { header: 'Tipo', cell: (category) => categoryTypeLabel(category.type) },
    {
      header: 'Cor',
      cell: (category) =>
        category.color ? (
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border" style={{ backgroundColor: category.color }} />
            {category.color}
          </div>
        ) : (
          '-'
        ),
    },
    {
      header: 'Status',
      cell: (category) => (
        <Badge variant={category.active ? 'success' : 'muted'}>
          {formatStatusLabel(category.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (category) => (
        <RowActions
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category)}
          isDeleting={deletingId === category.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={categories} getRowKey={(category) => category.id} />
}
