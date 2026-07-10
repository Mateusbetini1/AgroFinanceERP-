import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatDecimal, formatStatusLabel, formatSupplyCategory, formatUnit } from '@/lib/utils'
import type { Supply } from '@/types/api'

function formatPackageSize(supply: Supply) {
  if (!supply.packageSizeBaseQuantity || !supply.packageSizeUnit) return '-'
  return `${formatDecimal(supply.packageSizeBaseQuantity, 3)} ${formatUnit(supply.packageSizeUnit)}`
}

export function SuppliesTable({
  supplies,
  deletingId,
  onEdit,
  onDelete,
}: {
  supplies: Supply[]
  deletingId?: string | null
  onEdit: (supply: Supply) => void
  onDelete: (supply: Supply) => void
}) {
  const columns: DataTableColumn<Supply>[] = [
    { header: 'Nome', cell: (supply) => <span className="font-medium">{supply.name}</span> },
    { header: 'Categoria', cell: (supply) => formatSupplyCategory(supply.category) },
    { header: 'Unidade base', cell: (supply) => formatUnit(supply.baseUnit) },
    { header: 'Compra padrão', cell: (supply) => formatUnit(supply.purchaseUnitDefault) },
    { header: 'Embalagem', cell: formatPackageSize },
    {
      header: 'Status',
      cell: (supply) => (
        <Badge variant={supply.active ? 'success' : 'muted'}>
          {formatStatusLabel(supply.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (supply) => (
        <RowActions
          onEdit={() => onEdit(supply)}
          onDelete={() => onDelete(supply)}
          isDeleting={deletingId === supply.id}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={supplies}
      getRowKey={(supply) => supply.id}
      mobileCard={(supply) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{supply.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatSupplyCategory(supply.category)}</p>
            </div>
            <Badge variant={supply.active ? 'success' : 'muted'} className="shrink-0">
              {formatStatusLabel(supply.active ? 'ACTIVE' : 'INACTIVE')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Unidade base</p>
              <p className="mt-1 text-sm text-foreground">{formatUnit(supply.baseUnit)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Compra padrão</p>
              <p className="mt-1 text-sm text-foreground">{formatUnit(supply.purchaseUnitDefault)}</p>
            </div>
          </div>

          <RowActions
            onEdit={() => onEdit(supply)}
            onDelete={() => onDelete(supply)}
            isDeleting={deletingId === supply.id}
          />
        </div>
      )}
    />
  )
}
