import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { cn, formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
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

function parseDateOnly(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function daysUntil(date: string) {
  const dueDate = parseDateOnly(date)
  if (!dueDate) return null

  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((dueDate.getTime() - todayDate.getTime()) / 86_400_000)
}

function getMobileDueState(bill: Bill) {
  if (bill.status === 'PAID') {
    return {
      label: 'Pago',
      helper: bill.paidAt ? `Pago em ${formatDate(bill.paidAt)}` : 'Resolvido',
      badgeVariant: 'success' as const,
      cardClass: 'border-emerald-200 bg-emerald-50/50',
      valueClass: 'text-emerald-700',
    }
  }

  const remainingDays = daysUntil(bill.dueDate)

  if (bill.status === 'OVERDUE' || (remainingDays !== null && remainingDays < 0)) {
    return {
      label: 'Vencido',
      helper: remainingDays !== null ? `Atrasado há ${Math.abs(remainingDays)} dia(s)` : 'Atrasado',
      badgeVariant: 'destructive' as const,
      cardClass: 'border-rose-200 bg-rose-50/70',
      valueClass: 'text-rose-700',
    }
  }

  if (remainingDays === 0) {
    return {
      label: 'Vence hoje',
      helper: 'Prioridade para hoje',
      badgeVariant: 'warning' as const,
      cardClass: 'border-amber-300 bg-amber-50/80',
      valueClass: 'text-amber-700',
    }
  }

  if (remainingDays !== null && remainingDays <= 7) {
    return {
      label: `Vence em ${remainingDays} dia(s)`,
      helper: 'Próximo vencimento',
      badgeVariant: 'warning' as const,
      cardClass: 'border-amber-200 bg-amber-50/50',
      valueClass: 'text-amber-700',
    }
  }

  return {
    label: 'Em aberto',
    helper: 'Pendente',
    badgeVariant: 'secondary' as const,
    cardClass: 'border-border bg-card',
    valueClass: 'text-foreground',
  }
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
          <p className="text-xs text-muted-foreground">{bill.category?.name ?? 'Sem categoria'}</p>
        </div>
      ),
    },
    { header: 'Safra', cell: (bill) => <SafraName name={bill.safra?.name} /> },
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
      mobileCard={(bill) => {
        const dueState = getMobileDueState(bill)

        return (
          <div className={cn('space-y-4 rounded-lg border p-3', dueState.cardClass)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{bill.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{bill.category?.name ?? 'Sem categoria'}</p>
              </div>
              <Badge variant={dueState.badgeVariant} className="shrink-0">
                {dueState.label}
              </Badge>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 rounded-md border bg-background/70 p-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Valor</p>
                <p className="mt-1 text-xl font-semibold tracking-normal">{formatCurrency(bill.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase text-muted-foreground">Vencimento</p>
                <p className={cn('mt-1 text-base font-semibold', dueState.valueClass)}>{formatDate(bill.dueDate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{dueState.helper}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'destructive' : 'warning'}>
                {formatStatusLabel(bill.status)}
              </Badge>
              {bill.installmentNumber && bill.installmentCount && (
                <Badge variant="secondary">
                  Parcela {bill.installmentNumber}/{bill.installmentCount}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileMeta label="Pagamento" value={formatDate(bill.paidAt)} />
              <MobileMeta label="Fornecedor" value={bill.supplier?.name} />
              <MobileMeta label="Conta" value={bill.account?.name} />
              <MobileMeta label="Categoria" value={bill.category?.name} />
              <MobileMeta label="Safra" value={<SafraName name={bill.safra?.name} />} />
            </div>

            <div className="border-t pt-3">
              <RowActions
                onEdit={() => onEdit(bill)}
                onDelete={() => onDelete(bill)}
                isDeleting={deletingId === bill.id}
              />
            </div>
          </div>
        )
      }}
    />
  )
}
