import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InputPurchase } from '@/types/api'

function formatItems(purchase: InputPurchase) {
  if (purchase.items.length === 0) return '-'
  if (purchase.items.length === 1) return purchase.items[0].supply.name
  return `${purchase.items.length} itens`
}

export function InputPurchasesTable({ purchases }: { purchases: InputPurchase[] }) {
  const columns: DataTableColumn<InputPurchase>[] = [
    { header: 'Data', cell: (purchase) => formatDate(purchase.purchaseDate) },
    { header: 'Documento', cell: (purchase) => purchase.documentNumber ?? '-' },
    { header: 'Fornecedor', cell: (purchase) => purchase.supplier?.name ?? '-' },
    { header: 'Itens', cell: formatItems },
    { header: 'Valor total', cell: (purchase) => formatCurrency(purchase.totalAmount), className: 'text-right' },
    { header: 'Ações', cell: () => <span className="text-muted-foreground">-</span>, className: 'text-right' },
  ]

  return (
    <DataTable
      columns={columns}
      data={purchases}
      getRowKey={(purchase) => purchase.id}
      mobileCard={(purchase) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{formatDate(purchase.purchaseDate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{purchase.documentNumber ?? 'Sem documento'}</p>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Fornecedor</p>
              <p className="mt-1">{purchase.supplier?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Itens</p>
              <p className="mt-1">{formatItems(purchase)}</p>
            </div>
          </div>
        </div>
      )}
    />
  )
}
