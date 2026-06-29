'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatAccountType, formatCurrency } from '@/lib/utils'
import type { AccountForecast, AccountForecastMonth } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
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
      header: 'Primeiro mes negativo',
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
    { header: 'Mes', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Saldo inicial', cell: (month) => formatCurrency(month.startingBalance) },
    { header: 'Receitas', cell: (month) => formatCurrency(month.projectedReceivables) },
    { header: 'Despesas', cell: (month) => formatCurrency(month.projectedExpenses) },
    { header: 'Boletos', cell: (month) => formatCurrency(month.projectedBills) },
    { header: 'Saldo final', cell: (month) => formatCurrency(month.endingBalance) },
    {
      header: 'Alerta',
      cell: (month) => (
        <Badge variant={month.alert === 'NEGATIVE' ? 'destructive' : month.alert === 'WARNING' ? 'warning' : 'success'}>
          {month.alert === 'NEGATIVE' ? 'Negativo' : month.alert === 'WARNING' ? 'Atenção' : 'OK'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <DataTable columns={accountColumns} data={accounts} getRowKey={(account) => account.accountId} />
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meses da conta {selected.accountName}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={monthColumns} data={selected.months} getRowKey={(month) => `${month.year}-${month.month}`} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
