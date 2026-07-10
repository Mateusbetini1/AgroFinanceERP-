import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Expense } from '@/types/api'
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

function statusVariant(status: Expense['status']) {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE') return 'destructive'
  return 'warning'
}

function ExpenseMobileCard({
  expense,
  deletingId,
  onEdit,
  onDelete,
}: {
  expense: Expense
  deletingId?: string | null
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{expense.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">{expense.category.name}</p>
        </div>
        <Badge variant={statusVariant(expense.status)} className="shrink-0">
          {formatStatusLabel(expense.status)}
        </Badge>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Valor</p>
        <p className="mt-1 text-xl font-semibold tracking-normal">{formatCurrency(expense.amount)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileMeta label="Data" value={formatDate(expense.date)} />
        <MobileMeta label="Vencimento" value={formatDate(expense.dueDate)} />
        <MobileMeta label="Pagamento" value={formatDate(expense.paidAt)} />
        <MobileMeta label="Categoria" value={expense.category.name} />
        <MobileMeta label="Fornecedor" value={expense.supplier?.name} />
        <MobileMeta label="Conta" value={expense.account?.name} />
        <MobileMeta label="Safra" value={<SafraName name={expense.safra?.name} />} />
      </div>

      <RowActions
        onEdit={() => onEdit(expense)}
        onDelete={() => onDelete(expense)}
        isDeleting={deletingId === expense.id}
      />
    </div>
  )
}

export function ExpensesTable({
  expenses,
  deletingId,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  deletingId?: string | null
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  const columns: DataTableColumn<Expense>[] = [
    { header: 'Descrição', cell: (expense) => <span className="font-medium">{expense.description}</span> },
    { header: 'Categoria', cell: (expense) => expense.category.name },
    { header: 'Safra', cell: (expense) => <SafraName name={expense.safra?.name} /> },
    { header: 'Fornecedor', cell: (expense) => expense.supplier?.name ?? '-' },
    { header: 'Conta', cell: (expense) => expense.account?.name ?? '-' },
    { header: 'Valor', cell: (expense) => formatCurrency(expense.amount), className: 'text-right' },
    {
      header: 'Status',
      cell: (expense) => (
        <Badge variant={statusVariant(expense.status)}>
          {formatStatusLabel(expense.status)}
        </Badge>
      ),
    },
    {
      header: 'Data / vencimento',
      cell: (expense) => `${formatDate(expense.date)} / ${formatDate(expense.dueDate)}`,
    },
    { header: 'Pagamento', cell: (expense) => formatDate(expense.paidAt) },
    {
      header: '',
      className: 'text-right',
      cell: (expense) => (
        <RowActions
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense)}
          isDeleting={deletingId === expense.id}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={expenses}
      getRowKey={(expense) => expense.id}
      mobileCard={(expense) => (
        <ExpenseMobileCard expense={expense} deletingId={deletingId} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  )
}
