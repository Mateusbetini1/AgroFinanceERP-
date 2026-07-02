import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatAccountType, formatCurrency, formatStatusLabel } from '@/lib/utils'
import type { Account } from '@/types/api'

export function AccountsTable({
  accounts,
  deletingId,
  onEdit,
  onDelete,
}: {
  accounts: Account[]
  deletingId?: string | null
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  const columns: DataTableColumn<Account>[] = [
    { header: 'Nome', cell: (account) => <span className="font-medium">{account.name}</span> },
    { header: 'Tipo', cell: (account) => formatAccountType(account.type) },
    { header: 'Saldo atual', cell: (account) => formatCurrency(account.currentBalance), className: 'text-right' },
    { header: 'Saldo inicial', cell: (account) => formatCurrency(account.initialBalance), className: 'text-right' },
    {
      header: 'Status',
      cell: (account) => (
        <Badge variant={account.active ? 'success' : 'muted'}>
          {formatStatusLabel(account.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (account) => (
        <RowActions
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account)}
          isDeleting={deletingId === account.id}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={accounts}
      getRowKey={(account) => account.id}
      mobileCard={(account) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{account.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
            </div>
            <Badge variant={account.active ? 'success' : 'muted'}>
              {formatStatusLabel(account.active ? 'ACTIVE' : 'INACTIVE')}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Saldo atual</p>
            <p className="mt-1 text-xl font-semibold tracking-normal">{formatCurrency(account.currentBalance)}</p>
          </div>

          <RowActions
            onEdit={() => onEdit(account)}
            onDelete={() => onDelete(account)}
            isDeleting={deletingId === account.id}
          />
        </div>
      )}
    />
  )
}
