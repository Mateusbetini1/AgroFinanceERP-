import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Bill } from '@/types/api'
import type { ReactNode } from 'react'

function InstallmentBadge({ bill }: { bill: Bill }) {
  if (!bill.installmentNumber || !bill.installmentCount) return <span>-</span>

  return (
    <Badge variant="secondary">
      {bill.installmentNumber}/{bill.installmentCount}
    </Badge>
  )
}

function MobileMeta({ label, value }: { label: string; value: ReactNode }) {
  if (!value || value === '-') return null

  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  )
}

export function BillsTable({
  bills,
  deletingId,
  onEdit,
  onDelete,
}: {
  bills: Bill[]
  deletingId?: string | null
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  const columns: DataTableColumn<Bill>[] = [
    {
      header: 'Descrição',
      cell: (bill) => (
        <div>
          <p className="font-medium">{bill.description}</p>
          <p className="text-xs text-muted-foreground">
            {bill.category?.name ?? 'Sem categoria'} | {bill.safra?.name ?? 'Sem safra'}
          </p>
        </div>
      ),
    },
    { header: 'Fornecedor', cell: (bill) => bill.supplier?.name ?? '-' },
    { header: 'Conta', cell: (bill) => bill.account?.name ?? '-' },
    { header: 'Valor', cell: (bill) => formatCurrency(bill.amount), className: 'text-right' },
    { header: 'Vencimento', cell: (bill) => formatDate(bill.dueDate) },
    { header: 'Pagamento', cell: (bill) => formatDate(bill.paidAt) },
    { header: 'Parcela', cell: (bill) => <InstallmentBadge bill={bill} /> },
    {
      header: 'Status',
      cell: (bill) => (
        <Badge variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'destructive' : 'warning'}>
          {formatStatusLabel(bill.status)}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (bill) => (
        <RowActions
          onEdit={() => onEdit(bill)}
          onDelete={() => onDelete(bill)}
          isDeleting={deletingId === bill.id}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={bills}
      getRowKey={(bill) => bill.id}
      mobileCard={(bill) => (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{bill.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bill.category?.name ?? 'Sem categoria'} | {bill.safra?.name ?? 'Sem safra'}
              </p>
            </div>
            <Badge
              variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'destructive' : 'warning'}
              className="shrink-0"
            >
              {formatStatusLabel(bill.status)}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Valor</p>
            <p className="mt-1 text-xl font-semibold tracking-normal">{formatCurrency(bill.amount)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MobileMeta label="Vencimento" value={formatDate(bill.dueDate)} />
            <MobileMeta label="Pagamento" value={formatDate(bill.paidAt)} />
            <MobileMeta label="Fornecedor" value={bill.supplier?.name} />
            <MobileMeta label="Conta" value={bill.account?.name} />
            <MobileMeta label="Categoria" value={bill.category?.name} />
            <MobileMeta label="Safra" value={bill.safra?.name} />
            {bill.installmentNumber && bill.installmentCount && (
              <MobileMeta label="Parcela" value={`${bill.installmentNumber}/${bill.installmentCount}`} />
            )}
          </div>

          <RowActions
            onEdit={() => onEdit(bill)}
            onDelete={() => onDelete(bill)}
            isDeleting={deletingId === bill.id}
          />
        </div>
      )}
    />
  )
}
