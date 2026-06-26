import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardLiveAlert } from '../types'

function getAlertVariant(severity: DashboardLiveAlert['severity']) {
  if (severity === 'critical') return 'destructive'
  if (severity === 'warning') return 'warning'
  return 'default'
}

function getAlertLabel(severity: DashboardLiveAlert['severity']) {
  if (severity === 'critical') return 'Crítico'
  if (severity === 'warning') return 'Atenção'
  return 'Info'
}

export function FinancialAlerts({ alerts }: { alerts: DashboardLiveAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas financeiros</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Nenhum alerta financeiro no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <Badge variant={getAlertVariant(alert.severity)}>{getAlertLabel(alert.severity)}</Badge>
                </div>
                <p className="text-sm font-medium">{alert.message}</p>
                {alert.amount !== undefined && (
                  <p className="mt-1 text-xs text-muted-foreground">Valor: {formatCurrency(alert.amount)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
