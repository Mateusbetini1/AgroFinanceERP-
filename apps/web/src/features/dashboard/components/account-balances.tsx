import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAccountType, formatCurrency } from '@/lib/utils'
import type { DashboardLiveAccountBalance, DashboardLiveAccountProjection } from '../types'

interface AccountBalancesProps {
  balances: DashboardLiveAccountBalance[]
  projections: DashboardLiveAccountProjection[]
}

export function AccountBalances({ balances, projections }: AccountBalancesProps) {
  const projectionByAccount = new Map(projections.map((projection) => [projection.accountId, projection]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo por conta</CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta ativa encontrada.</p>
        ) : (
          <div className="space-y-3">
            {balances.map((account) => {
              const projection = projectionByAccount.get(account.accountId)

              return (
                <div key={account.accountId} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
                    </div>
                    <p className="text-right font-semibold">{formatCurrency(account.currentBalance)}</p>
                  </div>
                  {projection && (
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Projetado 30 dias</span>
                      <span className={projection.projectedBalance < 0 ? 'font-medium text-destructive' : ''}>
                        {formatCurrency(projection.projectedBalance)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
