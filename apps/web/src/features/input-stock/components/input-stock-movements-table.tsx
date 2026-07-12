import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import {
  formatCurrency,
  formatDate,
  formatInputStockMovementDirection,
  formatInputStockMovementType,
  formatQuantity,
  formatUnit,
} from '@/lib/utils'
import type { InputStockMovement } from '@/types/api'

export function InputStockMovementsTable({ movements }: { movements: InputStockMovement[] }) {
  const columns: DataTableColumn<InputStockMovement>[] = [
    { header: 'Data', cell: (movement) => formatDate(movement.occurredAt) },
    { header: 'Insumo', cell: (movement) => <span className="font-medium">{movement.supply.name}</span> },
    { header: 'Tipo', cell: (movement) => formatInputStockMovementType(movement.type) },
    {
      header: 'Entrada/Saída',
      cell: (movement) => (
        <Badge variant={movement.direction === 'IN' ? 'success' : 'warning'}>
          {formatInputStockMovementDirection(movement.direction)}
        </Badge>
      ),
    },
    {
      header: 'Quantidade',
      cell: (movement) => `${formatQuantity(movement.quantityBase)} ${formatUnit(movement.supply.baseUnit)}`,
      className: 'text-right',
    },
    { header: 'Custo unitário', cell: (movement) => formatCurrency(movement.unitCostBase), className: 'text-right' },
    { header: 'Total', cell: (movement) => formatCurrency(movement.totalCost), className: 'text-right' },
    {
      header: 'Saldo após',
      cell: (movement) => `${formatQuantity(movement.balanceQuantityAfter)} ${formatUnit(movement.supply.baseUnit)}`,
      className: 'text-right',
    },
  ]

  return <DataTable columns={columns} data={movements} getRowKey={(movement) => movement.id} />
}
