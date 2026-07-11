import { Trash2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { InputPurchase } from '@/types/api'

function formatItems(purchase: InputPurchase) {
  if (purchase.items.length === 0) return '-'
  if (purchase.items.length === 1) return purchase.items[0].supply.name
  return `${purchase.items.length} itens`
}

function StatusBadge({ purchase }: { purchase: InputPurchase }) {
  return (
    <Badge variant={purchase.status === 'CANCELED' ? 'muted' : 'success'}>
      {formatStatusLabel(purchase.status)}
    </Badge>
  )
}

export function InputPurchasesTable({
  purchases,
  cancelingId,
  deletingPermanentId,
  onCancel,
  onDeletePermanent,
}: {
  purchases: InputPurchase[]
  cancelingId?: string | null
  deletingPermanentId?: string | null
  onCancel: (purchase: InputPurchase) => void
  onDeletePermanent: (purchase: InputPurchase) => void
}) {
  function renderAction(purchase: InputPurchase, className?: string) {
    if (purchase.status === 'CANCELED') {
      return (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className={className}
          loading={deletingPermanentId === purchase.id}
          onClick={() => onDeletePermanent(purchase)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir permanentemente
        </Button>
      )
    }

    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className={className}
        loading={cancelingId === purchase.id}
        onClick={() => onCancel(purchase)}
      >
        <XCircle className="h-4 w-4" />
        Cancelar
      </Button>
    )
  }

  const columns: DataTableColumn<InputPurchase>[] = [
    { header: 'Data', cell: (purchase) => formatDate(purchase.purchaseDate) },
    { header: 'Documento', cell: (purchase) => purchase.documentNumber ?? '-' },
    { header: 'Fornecedor', cell: (purchase) => purchase.supplier?.name ?? '-' },
    { header: 'Itens', cell: formatItems },
    {
      header: 'Valor total',
      cell: (purchase) => formatCurrency(purchase.totalAmount),
      className: 'text-right',
    },
    { header: 'Status', cell: (purchase) => <StatusBadge purchase={purchase} /> },
    {
      header: 'Ações',
      cell: (purchase) => renderAction(purchase),
      className: 'text-right',
    },
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
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
              <div className="mt-2">
                <StatusBadge purchase={purchase} />
              </div>
            </div>
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

          {renderAction(purchase, 'w-full')}
        </div>
      )}
    />
  )
}
