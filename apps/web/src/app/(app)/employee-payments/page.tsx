'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { Button } from '@/components/ui/button'
import { listAccounts } from '@/features/accounts/api'
import {
  createEmployeePayment,
  deleteEmployeePayment,
  getPayrollSummary,
  listEmployeePayments,
  updateEmployeePayment,
  type EmployeePaymentPayload,
} from '@/features/employee-payments/api'
import { EmployeePaymentForm } from '@/features/employee-payments/components/employee-payment-form'
import { EmployeePaymentsTable } from '@/features/employee-payments/components/employee-payments-table'
import { listActiveEmployees } from '@/features/employees/api'
import { formatCurrency, formatPaymentType, getApiErrorMessage } from '@/lib/utils'
import type { EmployeePayment, PaymentType } from '@/types/api'

type MonthSelection = {
  month: number
  year: number
}

const emptyTotalsByType: Record<PaymentType, number> = {
  SALARY: 0,
  ADVANCE: 0,
  BONUS: 0,
  OVERTIME: 0,
  DAILY_WAGE: 0,
}

function getCurrentMonthSelection(): MonthSelection {
  const today = new Date()
  return { month: today.getMonth() + 1, year: today.getFullYear() }
}

function shiftMonth(selection: MonthSelection, direction: -1 | 1): MonthSelection {
  const date = new Date(selection.year, selection.month - 1 + direction, 1, 12)
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

function formatMonthLabel(selection: MonthSelection) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(selection.year, selection.month - 1, 1, 12),
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function TypeTotal({ type, value }: { type: PaymentType; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-sm text-muted-foreground">{formatPaymentType(type)}</p>
      <p className="mt-1 font-semibold">{formatCurrency(value)}</p>
    </div>
  )
}

export default function EmployeePaymentsPage() {
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>(() => getCurrentMonthSelection())

  const query = useQuery({
    queryKey: ['employee-payments', selectedMonth.year, selectedMonth.month],
    queryFn: () =>
      listEmployeePayments({ referenceMonth: selectedMonth.month, referenceYear: selectedMonth.year }),
  })
  const summaryQuery = useQuery({
    queryKey: ['employee-payments', 'payroll-summary', selectedMonth.year, selectedMonth.month],
    queryFn: () => getPayrollSummary(selectedMonth.year, selectedMonth.month),
  })
  const employeesQuery = useQuery({ queryKey: ['employees', 'active'], queryFn: listActiveEmployees })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const payments = query.data?.data ?? []
  const summary = summaryQuery.data
  const employees = employeesQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const totalsByType = summary?.totalsByType ?? emptyTotalsByType

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeePayment | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['employee-payments'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const refreshMonth = async () => {
    await Promise.all([query.refetch(), summaryQuery.refetch()])
  }

  const createMutation = useMutation({
    mutationFn: createEmployeePayment,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Pagamento criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeePaymentPayload }) => updateEmployeePayment(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Pagamento atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployeePayment,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Pagamento excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(payment: EmployeePayment) {
    setEditing(payment)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(payment: EmployeePayment) {
    if (!window.confirm(`Excluir o pagamento de ${payment.employee.name}?`)) return
    deleteMutation.mutate(payment.id)
  }

  function handleSubmit(payload: EmployeePaymentPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  const isAuxLoading = employeesQuery.isLoading || accountsQuery.isLoading
  const hasAuxError = employeesQuery.isError || accountsQuery.isError

  return (
    <>
      <ListPage
        title="Pagamentos de funcionários"
        description="Gestão mensal da folha, salários, diárias, bônus e adiantamentos."
        isLoading={query.isLoading || summaryQuery.isLoading}
        isError={query.isError || summaryQuery.isError}
        isEmpty={false}
        emptyMessage="Nenhum pagamento lançado neste mês."
        errorMessage="Não foi possível carregar os pagamentos de funcionários."
        onRetry={() => void refreshMonth()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2 md:justify-start">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Mês anterior"
                onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 px-2 text-center md:min-w-48">
                <p className="text-xs uppercase text-muted-foreground">Mês selecionado</p>
                <p className="text-base font-semibold">{formatMonthLabel(selectedMonth)}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Próximo mês"
                onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={() => void refreshMonth()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="Folha prevista" value={formatCurrency(summary?.payrollExpected ?? 0)} />
            <SummaryCard
              label="Já pago"
              value={formatCurrency(summary?.payrollTotalPaid ?? 0)}
              helper={`Salário/adiant.: ${formatCurrency(summary?.payrollSalaryPaid ?? 0)}`}
            />
            <SummaryCard label="A pagar" value={formatCurrency(summary?.payrollRemaining ?? 0)} />
            <SummaryCard
              label="Funcionarios"
              value={String(summary?.employeeCount ?? 0)}
              helper={`${summary?.employeesWithPendingSalary ?? 0} com salário pendente`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <TypeTotal type="SALARY" value={totalsByType.SALARY} />
            <TypeTotal type="DAILY_WAGE" value={totalsByType.DAILY_WAGE} />
            <TypeTotal type="BONUS" value={totalsByType.BONUS} />
            <TypeTotal type="ADVANCE" value={totalsByType.ADVANCE} />
            <TypeTotal type="OVERTIME" value={totalsByType.OVERTIME} />
          </div>

          {summary && summary.employees.length > 0 && (
            <section className="rounded-lg border">
              <div className="border-b p-4">
                <h2 className="text-sm font-semibold">Resumo por funcionário no mês</h2>
              </div>
              <div className="divide-y">
                {summary.employees.map((employee) => (
                  <div
                    key={employee.employeeId}
                    className="grid gap-3 p-4 text-sm md:grid-cols-[1.4fr_repeat(4,1fr)] md:items-center"
                  >
                    <div>
                      <p className="font-medium">{employee.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.employeeType === 'MONTHLY' ? 'Mensalista' : 'Diarista'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Previsto</p>
                      <p className="font-medium">{formatCurrency(employee.expectedSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pago</p>
                      <p className="font-medium">{formatCurrency(employee.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">A pagar</p>
                      <p className="font-medium">{formatCurrency(employee.remainingSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Extras</p>
                      <p className="font-medium">
                        {formatCurrency(employee.advancePaid + employee.bonusPaid + employee.overtimePaid + employee.dailyPaid)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Não foi possível carregar funcionários ou contas. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          {payments.length === 0 ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum pagamento lançado neste mês.</div>
          ) : (
            <EmployeePaymentsTable payments={payments} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar pagamento' : 'Novo pagamento'}
        description="Preencha os dados do pagamento ao funcionário."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        {employees.length === 0 && <InlineAlert>Cadastre ao menos um funcionário ativo antes de lançar pagamentos.</InlineAlert>}
        <div className="mt-4">
          <EmployeePaymentForm
            initialValue={editing}
            employees={employees}
            accounts={accounts}
            isSubmitting={createMutation.isPending || updateMutation.isPending || isAuxLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
