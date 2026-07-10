import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatDecimal, formatSupplyCategory, formatUnit } from '@/lib/utils'
import type { InputStockBalance } from '@/types/api'

export function InputStockTable({ balances }: { balances: InputStockBalance[] }) {
  const columns: DataTableColumn<InputStockBalance>[] = [
    { header: 'Insumo', cell: (balance) => <span className="font-medium">{balance.supply.name}</span> },
    { header: 'Categoria', cell: (balance) => formatSupplyCategory(balance.supply.category) },
    { header: 'Saldo', cell: (balance) => formatDecimal(balance.quantityBase, 3), className: 'text-right' },
    { header: 'Unidade base', cell: (balance) => formatUnit(balance.supply.baseUnit) },
    { header: 'Custo médio', cell: (balance) => formatCurrency(balance.averageCostBase), className: 'text-right' },
    { header: 'Valor em estoque', cell: (balance) => formatCurrency(balance.totalValue), className: 'text-right' },
    { header: 'Última atualização', cell: (balance) => formatDate(balance.updatedAt) },
  ]

  return (
    <DataTable
      columns={columns}
      data={balances}
      getRowKey={(balance) => balance.id}
      mobileCard={(balance) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div>
            <p className="break-words text-sm font-semibold text-foreground">{balance.supply.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatSupplyCategory(balance.supply.category)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Saldo</p>
              <p className="mt-1 font-semibold">
                {formatDecimal(balance.quantityBase, 3)} {formatUnit(balance.supply.baseUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Custo médio</p>
              <p className="mt-1">{formatCurrency(balance.averageCostBase)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Valor em estoque</p>
              <p className="mt-1">{formatCurrency(balance.totalValue)}</p>
            </div>
          </div>
        </div>
      )}
    />
  )
}
