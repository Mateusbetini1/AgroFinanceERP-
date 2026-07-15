import { Eye } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { cn, formatAccountType, formatCurrency, formatStatusLabel } from '@/lib/utils'
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
    {
      header: 'Nome',
      cell: (account) => (
        <Link href={`/accounts/${account.id}`} className="font-medium text-primary hover:underline">
          {account.name}
        </Link>
      ),
    },
    { header: 'Tipo', cell: (account) => formatAccountType(account.type) },
    {
      header: 'Saldo atual',
      cell: (account) => (
        <span className={cn(Number(account.currentBalance) < 0 && 'text-destructive')}>
          {formatCurrency(account.currentBalance)}
        </span>
      ),
      className: 'text-right',
    },
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
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href={`/accounts/${account.id}`}>
            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
              <Eye className="h-4 w-4" />
              Ver detalhes
            </Button>
          </Link>
          <RowActions
            onEdit={() => onEdit(account)}
            onDelete={() => onDelete(account)}
            isDeleting={deletingId === account.id}
          />
        </div>
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
              <Link href={`/accounts/${account.id}`} className="break-words text-sm font-semibold text-primary hover:underline">
                {account.name}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
            </div>
            <Badge variant={account.active ? 'success' : 'muted'}>
              {formatStatusLabel(account.active ? 'ACTIVE' : 'INACTIVE')}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Saldo atual</p>
            <p className={cn('mt-1 text-xl font-semibold tracking-normal', Number(account.currentBalance) < 0 && 'text-destructive')}>
              {formatCurrency(account.currentBalance)}
            </p>
          </div>

          <Link href={`/accounts/${account.id}`}>
            <Button type="button" variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4" />
              Ver detalhes
            </Button>
          </Link>

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
