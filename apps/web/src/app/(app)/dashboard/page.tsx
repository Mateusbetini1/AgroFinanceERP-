'use client'

import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Landmark,
  RefreshCcw,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getDashboardLive, getDashboardMonthly } from '@/features/dashboard/api'
import { FinancialPositionSection } from '@/features/dashboard/components/financial-position-section'
import { formatCurrency, formatEmployeeType } from '@/lib/utils'

type KpiTone = 'default' | 'positive' | 'negative' | 'warning'

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
  tone?: KpiTone
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-8 w-36 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const liveQuery = useQuery({
    queryKey: ['dashboard', 'live'],
    queryFn: getDashboardLive,
  })

  const query = useQuery({
    queryKey: ['dashboard', 'monthly', month, year],
    queryFn: () => getDashboardMonthly(month, year),
  })

  const payrollEmployees = query.data?.payroll.employees ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão financeira atual, compromissos, projeções e folha de funcionários.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="dashboard-month">Mês</Label>
            <Select id="dashboard-month" value={String(month)} onChange={(event) => setMonth(Number(event.target.value))}>
              {months.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-year">Ano</Label>
            <Input
              id="dashboard-year"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>

          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar mês
          </Button>
        </div>
      </div>

      <FinancialPositionSection
        data={liveQuery.data}
        isLoading={liveQuery.isLoading}
        isError={liveQuery.isError}
        onRetry={() => void liveQuery.refetch()}
      />

      <div>
        <h2 className="text-xl font-semibold tracking-normal text-foreground">Visão mensal</h2>
        <p className="text-sm text-muted-foreground">
          Caixa realizado, pendências e folha do mês selecionado.
        </p>
      </div>

      {query.isLoading && <LoadingGrid />}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Não foi possível carregar o dashboard mensal.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Receitas realizadas"
              value={formatCurrency(query.data.realizedRevenue)}
              icon={ArrowUpCircle}
              tone="positive"
            />
            <KpiCard title="Receitas pendentes" value={formatCurrency(query.data.pendingRevenue)} icon={CalendarClock} />
            <KpiCard
              title="Saídas pagas"
              value={formatCurrency(query.data.realizedOutflows)}
              icon={ArrowDownCircle}
              tone="negative"
            />
            <KpiCard
              title="Despesas e boletos pendentes"
              value={formatCurrency(query.data.pendingExpenses + query.data.pendingBills)}
              icon={WalletCards}
              tone="warning"
            />
            <KpiCard title="Folha prevista" value={formatCurrency(query.data.payroll.payrollExpected)} icon={UserRound} />
            <KpiCard
              title="Folha já paga"
              value={formatCurrency(query.data.payroll.payrollTotalPaid)}
              icon={UserRound}
              tone="negative"
            />
            <KpiCard
              title="Falta pagar folha"
              value={formatCurrency(query.data.payroll.payrollRemaining)}
              icon={UserRound}
              tone="warning"
            />
            <KpiCard
              title="Resultado realizado"
              value={formatCurrency(query.data.realizedResult)}
              icon={Landmark}
              tone={query.data.realizedResult >= 0 ? 'positive' : 'negative'}
            />
            <KpiCard
              title="Resultado previsto"
              value={formatCurrency(query.data.projectedResult)}
              icon={Landmark}
              tone={query.data.projectedResult >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Folha do mês</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mensalistas ativos entram automaticamente na folha prevista. Diaristas aparecem apenas pelo total pago
                enquanto não houver módulo de dias trabalhados.
              </p>
            </CardHeader>
            <CardContent>
              {payrollEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum funcionário ou pagamento encontrado para este mês.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
                        <th className="px-4 py-3">Funcionário</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3 text-right">Salário previsto</th>
                        <th className="px-4 py-3 text-right">Pago salário</th>
                        <th className="px-4 py-3 text-right">Extras</th>
                        <th className="px-4 py-3 text-right">Total pago</th>
                        <th className="px-4 py-3 text-right">Falta pagar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollEmployees.map((employee) => (
                        <tr key={employee.employeeId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{employee.employeeName}</td>
                          <td className="px-4 py-3">{formatEmployeeType(employee.employeeType)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(employee.expectedSalary)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(employee.salaryPaid)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(employee.extrasPaid + employee.dailyPaid)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(employee.totalPaid)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(employee.remainingSalary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
