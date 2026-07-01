'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatAccountType, formatCurrency } from '@/lib/utils'
import type { AccountForecast, AccountForecastMonth, ForecastAlertLevel } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function alertLabel(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'Negativo'
  if (alert === 'WARNING') return 'Atenção'
  return 'OK'
}

function alertVariant(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'destructive'
  if (alert === 'WARNING') return 'warning'
  return 'success'
}

function cardTone(alertOrBalance: ForecastAlertLevel | number) {
  if (typeof alertOrBalance === 'number') return alertOrBalance < 0 ? 'border-rose-200 bg-rose-50/70' : 'border-border bg-card'
  if (alertOrBalance === 'NEGATIVE') return 'border-rose-200 bg-rose-50/70'
  if (alertOrBalance === 'WARNING') return 'border-amber-200 bg-amber-50/60'
  return 'border-border bg-card'
}

export function AccountForecastTable({ accounts }: { accounts: AccountForecast[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(accounts[0]?.accountId ?? null)
  const selected = accounts.find((account) => account.accountId === selectedId) ?? accounts[0]

  const accountColumns: DataTableColumn<AccountForecast>[] = [
    {
      header: 'Conta',
      cell: (account) => (
        <div>
          <p className="font-medium">{account.accountName}</p>
          <p className="text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
        </div>
      ),
    },
    { header: 'Saldo atual', cell: (account) => formatCurrency(account.currentBalance) },
    { header: 'Saldo final projetado', cell: (account) => formatCurrency(account.finalProjectedBalance) },
    { header: 'Menor saldo projetado', cell: (account) => formatCurrency(account.lowestProjectedBalance) },
    {
      header: 'Primeiro mês negativo',
      cell: (account) =>
        account.firstNegativeMonth ? monthLabel(account.firstNegativeMonth.month, account.firstNegativeMonth.year) : '-',
    },
    {
      header: '',
      className: 'text-right',
      cell: (account) => (
        <Button
          type="button"
          variant={selected?.accountId === account.accountId ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setSelectedId(account.accountId)}
        >
          <Eye className="h-4 w-4" />
          Ver meses
        </Button>
      ),
    },
  ]

  const monthColumns: DataTableColumn<AccountForecastMonth>[] = [
    { header: 'Mês', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Saldo inicial', cell: (month) => formatCurrency(month.startingBalance) },
    { header: 'Receitas', cell: (month) => formatCurrency(month.projectedReceivables) },
    { header: 'Despesas', cell: (month) => formatCurrency(month.projectedExpenses) },
    { header: 'Boletos', cell: (month) => formatCurrency(month.projectedBills) },
    { header: 'Saldo final', cell: (month) => formatCurrency(month.endingBalance) },
    {
      header: 'Alerta',
      cell: (month) => <Badge variant={alertVariant(month.alert)}>{alertLabel(month.alert)}</Badge>,
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={accountColumns}
            data={accounts}
            getRowKey={(account) => account.accountId}
            mobileCard={(account) => (
              <div className={cn('space-y-4 rounded-lg border p-3', cardTone(account.lowestProjectedBalance))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">{account.accountName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
                  </div>
                  {account.firstNegativeMonth && <Badge variant="destructive">Negativa</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Saldo atual</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.currentBalance)}</p>
                  </div>
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Saldo final</p>
                    <p className={cn('mt-1 text-sm font-semibold', account.finalProjectedBalance < 0 && 'text-rose-700')}>
                      {formatCurrency(account.finalProjectedBalance)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Menor saldo</p>
                    <p className={cn('mt-1 text-sm font-semibold', account.lowestProjectedBalance < 0 && 'text-rose-700')}>
                      {formatCurrency(account.lowestProjectedBalance)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Primeiro negativo</p>
                    <p className="mt-1 text-sm font-semibold">
                      {account.firstNegativeMonth
                        ? monthLabel(account.firstNegativeMonth.month, account.firstNegativeMonth.year)
                        : '-'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={selected?.accountId === account.accountId ? 'secondary' : 'outline'}
                  className="h-11 w-full"
                  onClick={() => setSelectedId(account.accountId)}
                >
                  <Eye className="h-4 w-4" />
                  Ver meses
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meses da conta {selected.accountName}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={monthColumns}
              data={selected.months}
              getRowKey={(month) => `${month.year}-${month.month}`}
              mobileCard={(month) => (
                <div className={cn('space-y-4 rounded-lg border p-3', cardTone(month.alert))}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{monthLabel(month.month, month.year)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{selected.accountName}</p>
                    </div>
                    <Badge variant={alertVariant(month.alert)}>{alertLabel(month.alert)}</Badge>
                  </div>

                  <div className="rounded-md border bg-background/70 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Saldo final</p>
                    <p className={cn('mt-1 text-lg font-semibold', month.endingBalance < 0 && 'text-rose-700')}>
                      {formatCurrency(month.endingBalance)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Saldo inicial</p>
                      <p className="mt-1 font-medium">{formatCurrency(month.startingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Receitas</p>
                      <p className="mt-1 font-medium text-emerald-700">{formatCurrency(month.projectedReceivables)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Despesas</p>
                      <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.projectedExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Boletos</p>
                      <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.projectedBills)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
