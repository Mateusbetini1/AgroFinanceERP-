import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatDecimal, formatStatusLabel } from '@/lib/utils'
import type { Revenue } from '@/types/api'
import type { ReactNode } from 'react'

function MobileMeta({ label, value }: { label: string; value: ReactNode }) {
  if (!value || value === '-') return null

  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  )
}

function SafraName({ name }: { name?: string | null }) {
  const label = name ?? 'Sem safra'

  return (
    <span
      className={!name ? 'block max-w-[180px] truncate text-muted-foreground' : 'block max-w-[180px] truncate'}
      title={label}
    >
      {label}
    </span>
  )
}

function RevenueMobileCard({
  revenue,
  deletingId,
  onEdit,
  onDelete,
}: {
  revenue: Revenue
  deletingId?: string | null
  onEdit: (revenue: Revenue) => void
  onDelete: (revenue: Revenue) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{revenue.product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDecimal(revenue.quantity, 2)} unidade(s)
          </p>
        </div>
        <Badge variant={revenue.status === 'RECEIVED' ? 'success' : 'warning'} className="shrink-0">
          {formatStatusLabel(revenue.status)}
        </Badge>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Valor total</p>
        <p className="mt-1 text-xl font-semibold tracking-normal">{formatCurrency(revenue.totalAmount)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileMeta label="Data" value={formatDate(revenue.date)} />
        <MobileMeta label="Prev./Recebimento" value={formatDate(revenue.receivedAt)} />
        <MobileMeta label="Cliente" value={revenue.client} />
        <MobileMeta label="Conta" value={revenue.account?.name} />
        <MobileMeta label="Safra" value={<SafraName name={revenue.safra?.name} />} />
      </div>

      <RowActions
        onEdit={() => onEdit(revenue)}
        onDelete={() => onDelete(revenue)}
        isDeleting={deletingId === revenue.id}
      />
    </div>
  )
}

export function RevenuesTable({
  revenues,
  deletingId,
  onEdit,
  onDelete,
}: {
  revenues: Revenue[]
  deletingId?: string | null
  onEdit: (revenue: Revenue) => void
  onDelete: (revenue: Revenue) => void
}) {
  const columns: DataTableColumn<Revenue>[] = [
    { header: 'Produto', cell: (revenue) => <span className="font-medium">{revenue.product.name}</span> },
    { header: 'Safra', cell: (revenue) => <SafraName name={revenue.safra?.name} /> },
    { header: 'Cliente', cell: (revenue) => revenue.client ?? '-' },
    { header: 'Quantidade', cell: (revenue) => formatDecimal(revenue.quantity, 2), className: 'text-right' },
    { header: 'Valor total', cell: (revenue) => formatCurrency(revenue.totalAmount), className: 'text-right' },
    {
      header: 'Status',
      cell: (revenue) => (
        <Badge variant={revenue.status === 'RECEIVED' ? 'success' : 'warning'}>
          {formatStatusLabel(revenue.status)}
        </Badge>
      ),
    },
    { header: 'Conta', cell: (revenue) => revenue.account?.name ?? '-' },
    { header: 'Data', cell: (revenue) => formatDate(revenue.date) },
    { header: 'Prev./Recebimento', cell: (revenue) => formatDate(revenue.receivedAt) },
    {
      header: '',
      className: 'text-right',
      cell: (revenue) => (
        <RowActions
          onEdit={() => onEdit(revenue)}
          onDelete={() => onDelete(revenue)}
          isDeleting={deletingId === revenue.id}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={revenues}
      getRowKey={(revenue) => revenue.id}
      mobileCard={(revenue) => (
        <RevenueMobileCard revenue={revenue} deletingId={deletingId} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  )
}
