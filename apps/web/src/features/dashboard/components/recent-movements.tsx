import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { DashboardLiveMovement } from '../types'

function getMovementLabel(type: DashboardLiveMovement['type']) {
  const labels: Record<DashboardLiveMovement['type'], string> = {
    REVENUE: 'Receita',
    EXPENSE: 'Despesa',
    BILL: 'Boleto',
    EMPLOYEE_PAYMENT: 'Funcionário',
    TRANSFER: 'Transferência',
  }

  return labels[type]
}

export function RecentMovements({ movements }: { movements: DashboardLiveMovement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos movimentos</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum movimento financeiro encontrado.</p>
        ) : (
          <div className="space-y-3">
            {movements.map((movement) => {
              const Icon =
                movement.direction === 'INFLOW'
                  ? ArrowUpCircle
                  : movement.direction === 'OUTFLOW'
                    ? ArrowDownCircle
                    : ArrowLeftRight
              const amountClass =
                movement.direction === 'INFLOW'
                  ? 'text-emerald-700'
                  : movement.direction === 'OUTFLOW'
                    ? 'text-destructive'
                    : 'text-primary'

              return (
                <div key={`${movement.type}-${movement.id}`} className="flex items-start gap-3 rounded-md border p-3">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', amountClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{movement.description}</p>
                      <Badge variant="muted">{getMovementLabel(movement.type)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(movement.date)}
                      {movement.accountName ? ` • ${movement.accountName}` : ''}
                      {movement.fromAccountName && movement.toAccountName
                        ? ` • ${movement.fromAccountName} para ${movement.toAccountName}`
                        : ''}
                    </p>
                  </div>
                  <p className={cn('whitespace-nowrap text-sm font-semibold', amountClass)}>
                    {formatCurrency(movement.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
