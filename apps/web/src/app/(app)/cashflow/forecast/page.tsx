'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { AccountForecastTable } from '@/features/cashflow/forecast/components/account-forecast-table'
import { ForecastSummary } from '@/features/cashflow/forecast/components/forecast-summary'
import { ForecastTable } from '@/features/cashflow/forecast/components/forecast-table'
import { UnallocatedCommitments } from '@/features/cashflow/forecast/components/unallocated-commitments'
import { getCashflowForecast } from '@/features/cashflow/forecast/api'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'

export default function CashflowForecastPage() {
  const [months, setMonths] = useState(12)
  const query = useQuery({
    queryKey: ['dashboard', 'forecast', months],
    queryFn: () => getCashflowForecast(months),
  })

  const forecast = query.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Fluxo de Caixa Projetado</h1>
          <p className="text-sm text-muted-foreground">
            Projecao mensal de caixa considerando recebiveis, despesas, boletos e folha prevista.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <InlineAlert tone="success">
        A projecao total considera compromissos conhecidos. A projecao por conta e parcial e depende dos lancamentos
        terem conta definida. Valores sem conta aparecem como nao alocados.
      </InlineAlert>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label htmlFor="forecast-months">Horizonte</Label>
            <Select
              id="forecast-months"
              value={String(months)}
              onChange={(event) => setMonths(Number(event.target.value))}
            >
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="18">18 meses</option>
            </Select>
          </div>
          {forecast && (
            <p className="text-sm text-muted-foreground">
              Periodo: {String(forecast.period.startMonth).padStart(2, '0')}/{forecast.period.startYear} ate{' '}
              {String(forecast.period.endMonth).padStart(2, '0')}/{forecast.period.endYear}
            </p>
          )}
        </CardContent>
      </Card>

      {query.isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando projecao...
          </CardContent>
        </Card>
      )}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{getApiErrorMessage(query.error, 'Nao foi possivel carregar a projecao.')}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {forecast && (
        <>
          <ForecastSummary forecast={forecast} />

          {forecast.alerts.length > 0 && (
            <div className="space-y-2">
              {forecast.alerts.map((alert) => (
                <InlineAlert key={`${alert.type}:${alert.accountId ?? ''}:${alert.amount ?? ''}`}>
                  {alert.message}
                  {alert.amount !== undefined && <span className="ml-1 font-medium">{formatCurrency(alert.amount)}</span>}
                </InlineAlert>
              ))}
            </div>
          )}

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-foreground">Projecao mensal total</h2>
              <p className="text-sm text-muted-foreground">Saldo inicial e final projetado mes a mes.</p>
            </div>
            <Card>
              <CardContent className="p-0">
                <ForecastTable months={forecast.months} />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-foreground">Projecao por conta</h2>
              <p className="text-sm text-muted-foreground">
                Visao parcial baseada apenas em recebiveis e compromissos com conta definida.
              </p>
            </div>
            <AccountForecastTable accounts={forecast.accounts} />
          </section>

          <UnallocatedCommitments forecast={forecast} />
        </>
      )}
    </div>
  )
}
