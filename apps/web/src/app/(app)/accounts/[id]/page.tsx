'use client'

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import {
  getAccountSummary,
  updateAccount,
  type AccountPayload,
  type AccountSummary,
  type AccountSummaryMovement,
  type AccountSummaryPendingItem,
  type AccountSummarySourceType,
} from '@/features/accounts/api'
import { AccountForm } from '@/features/accounts/components/account-form'
import { cn, formatAccountType, formatCurrency, formatDate, formatStatusLabel, getApiErrorMessage } from '@/lib/utils'

function getMonthTitle(date: Date) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function addMonthsToDate(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function sourceLabel(sourceType: AccountSummarySourceType) {
  const labels: Record<AccountSummarySourceType, string> = {
    REVENUE: 'Receita',
    EXPENSE: 'Despesa',
    BILL: 'Boleto',
    EMPLOYEE_PAYMENT: 'Funcionario',
    TRANSFER: 'Transferencia',
  }

  return labels[sourceType]
}

function sourceHref(sourceType: AccountSummarySourceType) {
  const routes: Record<AccountSummarySourceType, string> = {
    REVENUE: '/revenues',
    EXPENSE: '/expenses',
    BILL: '/bills',
    EMPLOYEE_PAYMENT: '/employee-payments',
    TRANSFER: '/transfers',
  }

  return routes[sourceType]
}

function SummaryCard({
  title,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  title: string
  value: string
  detail: string
  tone?: 'positive' | 'negative' | 'warning'
  icon: typeof Banknote
}) {
  const toneClass = {
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
    default: 'bg-primary/10 text-primary',
  }[tone ?? 'default']

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-md p-2', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold tracking-normal', tone === 'negative' && 'text-destructive')}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function PendingGroup({
  title,
  items,
  emptyText,
}: {
  title: string
  items: AccountSummaryPendingItem[]
  emptyText: string
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="muted">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          {emptyText}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={`${item.sourceType}-${item.id}`}
              href={sourceHref(item.sourceType)}
              className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <Badge variant={item.status === 'OVERDUE' ? 'destructive' : 'muted'}>
                    {formatStatusLabel(item.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sourceLabel(item.sourceType)} - {formatDate(item.date)}
                  {item.supplier ? ` - ${item.supplier.name}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{formatCurrency(item.amount)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function PendingSection({ summary }: { summary: AccountSummary }) {
  const totalCount =
    summary.pending.revenues.length +
    summary.pending.expenses.length +
    summary.pending.bills.length +
    summary.pending.employeePayments.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pendencias desta conta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Apenas itens pendentes vinculados diretamente a esta conta.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalCount === 0 && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Nenhuma pendencia vinculada a esta conta.
          </div>
        )}
        <PendingGroup
          title="Receitas pendentes"
          items={summary.pending.revenues}
          emptyText="Nenhuma receita pendente nesta conta."
        />
        <PendingGroup
          title="Despesas pendentes"
          items={summary.pending.expenses}
          emptyText="Nenhuma despesa pendente nesta conta."
        />
        <PendingGroup
          title="Boletos pendentes"
          items={summary.pending.bills}
          emptyText="Nenhum boleto pendente nesta conta."
        />
        <PendingGroup
          title="Pagamentos de funcionarios pendentes"
          items={summary.pending.employeePayments}
          emptyText="Nenhum pagamento pendente vinculado a esta conta."
        />
      </CardContent>
    </Card>
  )
}

function MovementAmount({ movement }: { movement: AccountSummaryMovement }) {
  const isInflow = movement.direction === 'INFLOW'

  return (
    <span className={cn('font-semibold', isInflow ? 'text-emerald-700' : 'text-destructive')}>
      {isInflow ? '+' : '-'}{formatCurrency(movement.amount)}
    </span>
  )
}

function MovementsSection({ movements }: { movements: AccountSummaryMovement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Movimentacoes da conta</CardTitle>
        <p className="text-sm text-muted-foreground">Lancamentos reais que ja alteraram o saldo no periodo.</p>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Nenhuma movimentacao encontrada neste mes.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {movements.map((movement) => (
              <Link
                key={movement.id}
                href={sourceHref(movement.sourceType)}
                className="grid gap-2 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[110px_1fr_150px]"
              >
                <p className="text-sm text-muted-foreground">{formatDate(movement.date)}</p>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={movement.direction === 'INFLOW' ? 'success' : 'muted'}>
                      {sourceLabel(movement.sourceType)}
                    </Badge>
                    <p className="truncate text-sm font-medium">{movement.description}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Origem: {sourceLabel(movement.sourceType)}
                  </p>
                </div>
                <p className="text-left text-sm sm:text-right">
                  <MovementAmount movement={movement} />
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>()
  const accountId = params.id
  const queryClient = useQueryClient()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const query = useQuery({
    queryKey: ['accounts', accountId, 'summary', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: () =>
      getAccountSummary(accountId, {
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<AccountPayload, 'initialBalance'> }) =>
      updateAccount(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Conta atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  function handleSubmit(payload: AccountPayload) {
    const { initialBalance: _initialBalance, ...updatePayload } = payload
    updateMutation.mutate({ id: accountId, payload: updatePayload })
  }

  const summary = query.data
  const account = summary?.account

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/accounts" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Contas
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-normal text-foreground lg:text-2xl">
            {account?.name ?? 'Detalhe da conta'}
          </h1>
          <p className="text-sm text-muted-foreground">Resumo, pendencias e movimentacoes vinculadas a conta.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[auto_auto_auto] sm:items-center">
          <div className="grid grid-cols-[40px_1fr_40px] items-center rounded-md border border-input bg-background">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Mes anterior"
              onClick={() => setSelectedMonth((current) => addMonthsToDate(current, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[150px] text-center text-sm font-medium">{getMonthTitle(selectedMonth)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Proximo mes"
              onClick={() => setSelectedMonth((current) => addMonthsToDate(current, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => void query.refetch()} loading={query.isFetching}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button type="button" onClick={() => setDialogOpen(true)} disabled={!account}>
            <Pencil className="h-4 w-4" />
            Editar conta
          </Button>
        </div>
      </div>

      {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-3">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-8 w-32 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Nao foi possivel carregar o resumo da conta.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && account && (
        <>
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Tipo</p>
                <p className="mt-1 font-semibold">{formatAccountType(account.type)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Saldo atual</p>
                <p className={cn('mt-1 font-semibold', Number(account.currentBalance) < 0 && 'text-destructive')}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Saldo inicial</p>
                <p className="mt-1 font-semibold">{formatCurrency(account.initialBalance)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                <Badge className="mt-1" variant={account.active ? 'success' : 'muted'}>
                  {formatStatusLabel(account.active ? 'ACTIVE' : 'INACTIVE')}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Periodo</p>
                <p className="mt-1 font-semibold">{getMonthTitle(selectedMonth)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Entradas no periodo"
              value={formatCurrency(summary.totals.inflows)}
              detail="Recebimentos e transferencias de entrada"
              icon={ArrowUpCircle}
              tone="positive"
            />
            <SummaryCard
              title="Saidas no periodo"
              value={formatCurrency(summary.totals.outflows)}
              detail="Pagamentos e transferencias de saida"
              icon={ArrowDownCircle}
              tone="negative"
            />
            <SummaryCard
              title="Saldo liquido"
              value={formatCurrency(summary.totals.net)}
              detail="Entradas menos saidas do periodo"
              icon={Banknote}
              tone={summary.totals.net < 0 ? 'negative' : 'positive'}
            />
            <SummaryCard
              title="Pendencias futuras"
              value={formatCurrency(summary.totals.pendingInflows - summary.totals.pendingOutflows)}
              detail="Pendentes vinculados a conta no periodo"
              icon={CalendarClock}
              tone={summary.totals.pendingInflows - summary.totals.pendingOutflows < 0 ? 'warning' : 'positive'}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PendingSection summary={summary} />
            <MovementsSection movements={summary.movements} />
          </div>
        </>
      )}

      {account && (
        <Dialog
          open={dialogOpen}
          title="Editar conta"
          description="Atualize os dados cadastrais da conta. O saldo inicial nao e alterado na edicao."
          onClose={() => setDialogOpen(false)}
        >
          {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
          <div className="mt-4">
            <AccountForm
              initialValue={account}
              isSubmitting={updateMutation.isPending}
              onSubmit={handleSubmit}
              onCancel={() => setDialogOpen(false)}
            />
          </div>
        </Dialog>
      )}
    </div>
  )
}
