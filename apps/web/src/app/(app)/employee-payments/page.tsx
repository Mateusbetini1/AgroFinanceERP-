'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listAccounts } from '@/features/accounts/api'
import {
  createEmployeePayment,
  deleteEmployeePayment,
  listEmployeePayments,
  updateEmployeePayment,
  type EmployeePaymentPayload,
} from '@/features/employee-payments/api'
import { EmployeePaymentForm } from '@/features/employee-payments/components/employee-payment-form'
import { EmployeePaymentsTable } from '@/features/employee-payments/components/employee-payments-table'
import { listActiveEmployees } from '@/features/employees/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { EmployeePayment } from '@/types/api'

export default function EmployeePaymentsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['employee-payments'], queryFn: listEmployeePayments })
  const employeesQuery = useQuery({ queryKey: ['employees', 'active'], queryFn: listActiveEmployees })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const payments = query.data?.data ?? []
  const employees = employeesQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeePayment | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['employee-payments'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
        description="Lançamentos de salários, diárias, bônus e adiantamentos."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={payments.length === 0}
        emptyMessage="Nenhum pagamento de funcionário encontrado."
        errorMessage="Não foi possível carregar os pagamentos de funcionários."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Não foi possível carregar funcionários ou contas. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          <EmployeePaymentsTable payments={payments} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
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
