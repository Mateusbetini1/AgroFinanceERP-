'use client'

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PlusCircle,
  RefreshCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { getDashboardOperationalSummary } from '@/features/dashboard/api'
import type { OperationalSummaryItem, OperationalSummaryMode } from '@/features/dashboard/types'
import { cn, formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'

type SummaryTone = 'default' | 'positive' | 'negative' | 'warning'

const modes: Array<{ value: OperationalSummaryMode; label: string }> = [
  { value: 'current-month', label: 'Mes atual' },
  { value: 'next-30-days', label: 'Proximos 30 dias' },
]

const quickActions = [
  { href: '/revenues', label: 'Nova receita' },
  { href: '/expenses', label: 'Nova despesa' },
  { href: '/bills', label: 'Novo boleto' },
  { href: '/employee-payments', label: 'Pagamento funcionario' },
]

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  detail?: string
  icon: ComponentType<{ className?: string }>
  tone?: SummaryTone
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-md p-2', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

function statusBadge(item: OperationalSummaryItem) {
  if (item.isOverdue) return <Badge variant="destructive">Vencido</Badge>
  if (item.isToday) return <Badge variant="warning">Hoje</Badge>
  return <Badge variant="muted">{formatStatusLabel(item.status)}</Badge>
}

function itemTypeLabel(type: OperationalSummaryItem['type']) {
  const labels = {
    REVENUE: 'Receita',
    EXPENSE: 'Despesa',
    BILL: 'Boleto',
    PAYROLL: 'Folha',
  }

  return labels[type]
}

function EventLine({ label, item }: { label: string; item: OperationalSummaryItem | null }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{item ? item.title : 'Nenhum item aberto'}</p>
      </div>
      {item && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
        </div>
      )}
    </div>
  )
}

function AttentionNow({
  overduePayables,
  dueTodayPayables,
  overdueReceivables,
  dueTodayReceivables,
  nextPayable,
  nextReceivable,
}: {
  overduePayables: number
  dueTodayPayables: number
  overdueReceivables: number
  dueTodayReceivables: number
  nextPayable: OperationalSummaryItem | null
  nextReceivable: OperationalSummaryItem | null
}) {
  const alerts = [
    { label: 'Pagamentos vencidos', value: overduePayables, tone: overduePayables > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Pagamentos hoje', value: dueTodayPayables, tone: dueTodayPayables > 0 ? 'text-amber-700' : 'text-muted-foreground' },
    { label: 'Recebimentos atrasados', value: overdueReceivables, tone: overdueReceivables > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Recebimentos hoje', value: dueTodayReceivables, tone: dueTodayReceivables > 0 ? 'text-amber-700' : 'text-muted-foreground' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Atencao agora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {alerts.map((alert) => (
            <div key={alert.label} className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">{alert.label}</p>
              <p className={cn('text-xl font-semibold', alert.tone)}>{alert.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <EventLine label="Proximo pagamento" item={nextPayable} />
          <EventLine label="Proximo recebimento" item={nextReceivable} />
        </div>
      </CardContent>
    </Card>
  )
}

function PendingList({
  title,
  items,
  count,
  emptyText,
  href,
}: {
  title: string
  items: OperationalSummaryItem[]
  count: number
  emptyText: string
  href: string
}) {
  const visibleItems = items.slice(0, 5)
  const hasMore = count > visibleItems.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{count} em aberto</p>
        </div>
        {hasMore && (
          <Link href={href} className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {visibleItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('truncate text-sm font-medium', item.isOverdue && 'text-destructive')}>
                      {item.title}
                    </p>
                    {statusBadge(item)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {itemTypeLabel(item.type)} - {formatDate(item.date)}
                    {item.supplier ? ` - ${item.supplier.name}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [mode, setMode] = useState<OperationalSummaryMode>('current-month')
  const query = useQuery({
    queryKey: ['dashboard', 'operational-summary', mode],
    queryFn: () => getDashboardOperationalSummary(mode),
  })

  const balanceTone = (query.data?.summary.expectedBalance ?? 0) >= 0 ? 'positive' : 'negative'

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-foreground lg:text-2xl">Painel do mes</h1>
          <p className="text-sm text-muted-foreground">Recebimentos e pagamentos em aberto, ordenados por data.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[190px_auto] sm:items-end">
          <Select value={mode} onChange={(event) => setMode(event.target.value as OperationalSummaryMode)}>
            {modes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={() => void query.refetch()} loading={query.isFetching}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PlusCircle className="h-4 w-4" />
            {action.label}
          </Link>
        ))}
      </div>

      {query.isLoading && <LoadingState />}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Nao foi possivel carregar o painel operacional.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="A receber"
              value={formatCurrency(query.data.summary.totalToReceive)}
              detail={`${query.data.receivables.count} pendente(s)`}
              icon={ArrowUpCircle}
              tone="positive"
            />
            <SummaryCard
              title="A pagar"
              value={formatCurrency(query.data.summary.totalToPay)}
              detail={`${query.data.payables.count} pendente(s)`}
              icon={ArrowDownCircle}
              tone="negative"
            />
            <SummaryCard
              title="Saldo previsto"
              value={formatCurrency(query.data.summary.expectedBalance)}
              detail="A receber menos a pagar"
              icon={Banknote}
              tone={balanceTone}
            />
            <SummaryCard
              title="Recebimentos"
              value={String(query.data.receivables.count)}
              detail="Itens em aberto"
              icon={CalendarClock}
            />
            <SummaryCard
              title="Pagamentos"
              value={String(query.data.payables.count)}
              detail="Itens em aberto"
              icon={Clock3}
              tone="warning"
            />
          </div>

          <AttentionNow
            overduePayables={query.data.payables.overdueCount}
            dueTodayPayables={query.data.payables.dueTodayCount}
            overdueReceivables={query.data.receivables.overdueCount}
            dueTodayReceivables={query.data.receivables.dueTodayCount}
            nextPayable={query.data.nextEvents.nextPayable}
            nextReceivable={query.data.nextEvents.nextReceivable}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <PendingList
              title="A receber"
              items={query.data.receivables.items}
              count={query.data.receivables.count}
              emptyText="Nenhum recebimento pendente no periodo."
              href="/revenues"
            />
            <PendingList
              title="A pagar"
              items={query.data.payables.items}
              count={query.data.payables.count}
              emptyText="Nenhum pagamento pendente no periodo."
              href="/expenses"
            />
          </div>
        </>
      )}
    </div>
  )
}
