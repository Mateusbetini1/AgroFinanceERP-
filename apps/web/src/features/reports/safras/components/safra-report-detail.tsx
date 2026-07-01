import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency, formatDate, formatSafraStatus } from '@/lib/utils'
import type {
  SafraExpenseByCategory,
  SafraReportDetail as SafraReportDetailType,
  SafraReportMovement,
  SafraRevenueByProductClient,
} from '../types'

function movementLabel(item: SafraReportMovement) {
  return item.sourceLabel ?? (item.type === 'REVENUE' ? 'Receita' : item.type === 'BILL' ? 'Boleto' : 'Despesa')
}

function movementTone(item: SafraReportMovement) {
  if (item.type === 'REVENUE') return 'border-emerald-200 bg-emerald-50/50'
  if (item.type === 'BILL') return 'border-amber-200 bg-amber-50/50'
  return 'border-rose-200 bg-rose-50/50'
}

function SummaryItem({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' | 'warning' }) {
  const toneClass = {
    positive: 'bg-emerald-50/50 text-emerald-700',
    negative: 'bg-rose-50/50 text-rose-700',
    warning: 'bg-amber-50/50 text-amber-700',
  }[tone ?? 'positive']

  return (
    <div className={cn('rounded-md border bg-muted/30 p-3 sm:border-0 sm:bg-transparent sm:p-0', tone && toneClass)}>
      <p className="text-muted-foreground">{label}</p>
      <p className={cn('font-medium', tone && 'sm:text-foreground')}>{value}</p>
    </div>
  )
}

export function SafraReportDetail({ detail }: { detail: SafraReportDetailType }) {
  const costsByCategory = detail.costsByCategory ?? detail.expensesByCategory

  const expenseColumns: DataTableColumn<SafraExpenseByCategory>[] = [
    { header: 'Categoria', cell: (item) => item.categoryName },
    { header: 'Despesas', cell: (item) => formatCurrency(item.expenseAmount) },
    { header: 'Boletos', cell: (item) => formatCurrency(item.billAmount) },
    { header: 'Pago', cell: (item) => formatCurrency(item.paidAmount) },
    { header: 'Pendente', cell: (item) => formatCurrency(item.pendingAmount) },
    { header: 'Total', cell: (item) => formatCurrency(item.totalAmount) },
  ]

  const revenueColumns: DataTableColumn<SafraRevenueByProductClient>[] = [
    { header: 'Produto', cell: (item) => item.productName },
    { header: 'Cliente', cell: (item) => item.client ?? '-' },
    { header: 'Recebido', cell: (item) => formatCurrency(item.receivedAmount) },
    { header: 'Pendente', cell: (item) => formatCurrency(item.pendingAmount) },
    { header: 'Total', cell: (item) => formatCurrency(item.totalAmount) },
  ]

  const movementColumns: DataTableColumn<SafraReportMovement>[] = [
    { header: 'Data', cell: (item) => formatDate(item.date) },
    { header: 'Tipo', cell: (item) => movementLabel(item) },
    { header: 'Descrição', cell: (item) => item.description },
    { header: 'Status', cell: (item) => item.status },
    { header: 'Valor', cell: (item) => formatCurrency(item.amount) },
  ]

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhe da safra</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Safra" value={detail.summary.safraName} />
          <SummaryItem label="Produto" value={detail.summary.product.name} />
          <SummaryItem label="Local" value={detail.summary.farmLocation?.name ?? '-'} />
          <SummaryItem label="Status" value={formatSafraStatus(detail.summary.status)} />
          <SummaryItem label="Receita total" value={formatCurrency(detail.summary.totalRevenue)} tone="positive" />
          <SummaryItem label="Despesa total" value={formatCurrency(detail.summary.totalExpenses)} tone="negative" />
          <SummaryItem label="Boletos/contas" value={formatCurrency(detail.summary.totalBills)} tone="warning" />
          <SummaryItem label="Custos totais" value={formatCurrency(detail.summary.totalCosts)} tone="negative" />
          <SummaryItem
            label="Resultado previsto"
            value={formatCurrency(detail.summary.projectedResult)}
            tone={detail.summary.projectedResult < 0 ? 'negative' : 'positive'}
          />
          <SummaryItem
            label="Resultado realizado"
            value={formatCurrency(detail.summary.realizedResult)}
            tone={detail.summary.realizedResult < 0 ? 'negative' : 'positive'}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {costsByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum custo vinculado.</p>
            ) : (
              <DataTable
                columns={expenseColumns}
                data={costsByCategory}
                getRowKey={(item) => item.categoryId ?? 'uncategorized'}
                mobileCard={(item) => (
                  <div className="space-y-3 rounded-lg border bg-card p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.categoryName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Custos vinculados à safra</p>
                    </div>
                    <div className="rounded-md border bg-rose-50/50 p-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
                      <p className="mt-1 text-lg font-semibold text-rose-700">{formatCurrency(item.totalAmount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Despesas</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.expenseAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Boletos</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.billAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Pago</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Pendente</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.pendingAmount)}</p>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por produto/cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.revenuesByProductClient.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma receita vinculada.</p>
            ) : (
              <DataTable
                columns={revenueColumns}
                data={detail.revenuesByProductClient}
                getRowKey={(item) => `${item.productId}:${item.client ?? ''}`}
                mobileCard={(item) => (
                  <div className="space-y-3 rounded-lg border bg-card p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.client ?? 'Sem cliente'}</p>
                    </div>
                    <div className="rounded-md border bg-emerald-50/50 p-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-700">{formatCurrency(item.totalAmount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Recebido</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.receivedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Pendente</p>
                        <p className="mt-1 font-medium">{formatCurrency(item.pendingAmount)}</p>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos lançamentos vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento vinculado.</p>
          ) : (
            <DataTable
              columns={movementColumns}
              data={detail.recentMovements}
              getRowKey={(item) => `${item.type}:${item.id}`}
              mobileCard={(item) => (
                <div className={cn('space-y-3 rounded-lg border p-3', movementTone(item))}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-foreground">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                    <Badge variant="secondary">{movementLabel(item)}</Badge>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-3 rounded-md border bg-background/70 p-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                      <p className="mt-1 text-sm font-medium">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Valor</p>
                      <p className="mt-1 text-sm font-semibold">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
