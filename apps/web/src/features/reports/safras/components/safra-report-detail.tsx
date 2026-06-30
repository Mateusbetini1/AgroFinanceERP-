import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatSafraStatus } from '@/lib/utils'
import type {
  SafraExpenseByCategory,
  SafraReportDetail as SafraReportDetailType,
  SafraReportMovement,
  SafraRevenueByProductClient,
} from '../types'

export function SafraReportDetail({ detail }: { detail: SafraReportDetailType }) {
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
    { header: 'Tipo', cell: (item) => item.sourceLabel ?? (item.type === 'REVENUE' ? 'Receita' : item.type === 'BILL' ? 'Boleto' : 'Despesa') },
    { header: 'Descricao', cell: (item) => item.description },
    { header: 'Status', cell: (item) => item.status },
    { header: 'Valor', cell: (item) => formatCurrency(item.amount) },
  ]

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhe da safra</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Safra</p>
            <p className="font-medium">{detail.summary.safraName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Produto</p>
            <p className="font-medium">{detail.summary.product.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Local</p>
            <p className="font-medium">{detail.summary.farmLocation?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">{formatSafraStatus(detail.summary.status)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Receita total</p>
            <p className="font-medium">{formatCurrency(detail.summary.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Despesa total</p>
            <p className="font-medium">{formatCurrency(detail.summary.totalExpenses)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Boletos/contas</p>
            <p className="font-medium">{formatCurrency(detail.summary.totalBills)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custos totais</p>
            <p className="font-medium">{formatCurrency(detail.summary.totalCosts)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Resultado previsto</p>
            <p className="font-medium">{formatCurrency(detail.summary.projectedResult)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Resultado realizado</p>
            <p className="font-medium">{formatCurrency(detail.summary.realizedResult)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {(detail.costsByCategory ?? detail.expensesByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum custo vinculado.</p>
            ) : (
              <DataTable columns={expenseColumns} data={detail.costsByCategory ?? detail.expensesByCategory} getRowKey={(item) => item.categoryId ?? 'uncategorized'} />
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
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimos lancamentos vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lancamento vinculado.</p>
          ) : (
            <DataTable columns={movementColumns} data={detail.recentMovements} getRowKey={(item) => `${item.type}:${item.id}`} />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
