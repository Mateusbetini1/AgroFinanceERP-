'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  type EmployeePayload,
} from '@/features/employees/api'
import { EmployeeForm } from '@/features/employees/components/employee-form'
import { EmployeesTable } from '@/features/employees/components/employees-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Employee } from '@/types/api'

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['employees'], queryFn: listEmployees })

  const employees = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async (shouldRefreshPayments = false) => {
    await queryClient.invalidateQueries({ queryKey: ['employees'] })
    await queryClient.invalidateQueries({ queryKey: ['employees', 'active'] })
    if (shouldRefreshPayments) await queryClient.invalidateQueries({ queryKey: ['employee-payments'] })
  }

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Funcionário criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeePayload }) => updateEmployee(id, payload),
    onSuccess: async (_employee, variables) => {
      await invalidate(Boolean(variables.payload.status || variables.payload.name))
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Funcionário atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate(true)
      setFeedback({ type: 'success', message: 'Funcionário excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(employee: Employee) {
    setEditing(employee)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(employee: Employee) {
    if (
      !window.confirm(
        'Excluir funcionário? Ele será inativado e removido da listagem, mas pagamentos históricos serão mantidos.',
      )
    ) {
      return
    }
    deleteMutation.mutate(employee.id)
  }

  function handleSubmit(payload: EmployeePayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Funcionários"
        description="Equipe operacional, vínculos e salários base."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={employees.length === 0}
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <EmployeesTable employees={employees} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar funcionário' : 'Novo funcionário'}
        description="Preencha os dados do funcionário."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <EmployeeForm
            initialValue={editing}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
