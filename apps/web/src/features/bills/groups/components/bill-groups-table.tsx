import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { BillGroupStatus, BillGroupSummary } from '../types'

export function formatBillGroupStatus(status: BillGroupStatus): string {
  const labels: Record<BillGroupStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
  }

  return labels[status]
}

function statusVariant(status: BillGroupStatus) {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE') return 'destructive'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'secondary'
}

function InstallmentProgress({ group }: { group: BillGroupSummary }) {
  return (
    <span>
      {group.paidInstallments} paga{group.paidInstallments === 1 ? '' : 's'} /{' '}
      {group.pendingInstallments + group.overdueInstallments} pendente
      {group.pendingInstallments + group.overdueInstallments === 1 ? '' : 's'}
    </span>
  )
}

function progressPercent(group: BillGroupSummary) {
  if (!group.activeInstallments) return 0
  return Math.min(100, Math.max(0, Math.round((group.paidInstallments / group.activeInstallments) * 100)))
}

function groupToneClass(status: BillGroupStatus) {
  if (status === 'PAID') return 'border-emerald-200 bg-emerald-50/50'
  if (status === 'OVERDUE') return 'border-rose-200 bg-rose-50/70'
  if (status === 'IN_PROGRESS') return 'border-amber-200 bg-amber-50/50'
  return 'border-border bg-card'
}

export function BillGroupsTable({
  groups,
  selectedId,
  onSelect,
}: {
  groups: BillGroupSummary[]
  selectedId?: string | null
  onSelect: (group: BillGroupSummary) => void
}) {
  const columns: DataTableColumn<BillGroupSummary>[] = [
    {
      header: 'Descrição',
      cell: (group) => (
        <div>
          <p className="font-medium">{group.description}</p>
          <p className="text-xs text-muted-foreground">
            {group.categoryMixed ? 'Categoria mista' : group.category?.name ?? 'Sem categoria'} |{' '}
            {group.safraMixed ? 'Safra mista' : group.safra?.name ?? 'Sem safra'}
          </p>
        </div>
      ),
    },
    { header: 'Fornecedor', cell: (group) => group.supplier?.name ?? '-' },
    { header: 'Total original', cell: (group) => formatCurrency(group.totalAmount), className: 'text-right' },
    { header: 'Pago', cell: (group) => formatCurrency(group.paidAmount), className: 'text-right' },
    { header: 'Pendente', cell: (group) => formatCurrency(group.pendingAmount), className: 'text-right' },
    { header: 'Parcelas', cell: (group) => <InstallmentProgress group={group} /> },
    { header: 'Próximo venc.', cell: (group) => formatDate(group.nextDueDate) },
    {
      header: 'Status',
      cell: (group) => <Badge variant={statusVariant(group.status)}>{formatBillGroupStatus(group.status)}</Badge>,
    },
    {
      header: '',
      className: 'text-right',
      cell: (group) => (
        <Button type="button" variant={selectedId === group.id ? 'secondary' : 'outline'} size="sm" onClick={() => onSelect(group)}>
          Detalhar
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={groups}
      getRowKey={(group) => group.id}
      mobileCard={(group) => {
        const progress = progressPercent(group)
        const categoryLabel = group.categoryMixed ? 'Categoria mista' : group.category?.name
        const safraLabel = group.safraMixed ? 'Safra mista' : group.safra?.name

        return (
          <div className={cn('space-y-4 rounded-lg border p-3', groupToneClass(group.status))}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{group.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{group.supplier?.name ?? 'Sem fornecedor'}</p>
              </div>
              <Badge variant={statusVariant(group.status)} className="shrink-0">
                {formatBillGroupStatus(group.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-background/70 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(group.totalAmount)}</p>
              </div>
              <div className="rounded-md border bg-background/70 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Pago</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(group.paidAmount)}</p>
              </div>
              <div className="rounded-md border bg-background/70 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Pendente</p>
                <p className="mt-1 text-sm font-semibold text-amber-700">{formatCurrency(group.pendingAmount)}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-md border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">
                  {group.paidInstallments} de {group.activeInstallments} parcelas pagas
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {group.pendingInstallments} pendente{group.pendingInstallments === 1 ? '' : 's'}
                {group.overdueInstallments > 0
                  ? ` | ${group.overdueInstallments} vencida${group.overdueInstallments === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Próximo venc.</p>
                <p className="mt-1 font-medium">{formatDate(group.nextDueDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Parcelas</p>
                <p className="mt-1 font-medium">
                  {group.activeInstallments}/{group.installmentCount}
                </p>
              </div>
              {categoryLabel && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Categoria</p>
                  <p className="mt-1">{categoryLabel}</p>
                </div>
              )}
              {safraLabel && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Safra</p>
                  <p className="mt-1">{safraLabel}</p>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant={selectedId === group.id ? 'secondary' : 'outline'}
              className="h-11 w-full"
              onClick={() => onSelect(group)}
            >
              Detalhar
            </Button>
          </div>
        )
      }}
    />
  )
}
