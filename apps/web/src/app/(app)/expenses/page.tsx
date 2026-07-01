'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listAccounts } from '@/features/accounts/api'
import { listCategories } from '@/features/categories/api'
import { createExpense, deleteExpense, listExpenses, updateExpense, type ExpensePayload } from '@/features/expenses/api'
import { ExpenseForm } from '@/features/expenses/components/expense-form'
import { ExpensesTable } from '@/features/expenses/components/expenses-table'
import { listSafras } from '@/features/safras/api'
import { listSuppliers } from '@/features/suppliers/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { Expense } from '@/types/api'

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['expenses'], queryFn: listExpenses })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })

  const expenses = query.data?.data ?? []
  const categories = categoriesQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['expenses'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Despesa criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExpensePayload }) => updateExpense(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Despesa atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Despesa excluída com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(expense: Expense) {
    if (!window.confirm(`Excluir a despesa "${expense.description}"?`)) return
    deleteMutation.mutate(expense.id)
  }

  function handleSubmit(payload: ExpensePayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  const isAuxLoading =
    categoriesQuery.isLoading || suppliersQuery.isLoading || accountsQuery.isLoading || safrasQuery.isLoading
  const hasAuxError = categoriesQuery.isError || suppliersQuery.isError || accountsQuery.isError || safrasQuery.isError

  return (
    <>
      <ListPage
        title="Despesas"
        description="Despesas operacionais e financeiras lançadas."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={expenses.length === 0}
        emptyMessage="Nenhuma despesa encontrada."
        errorMessage="Não foi possível carregar as despesas."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Não foi possível carregar todos os campos de apoio do formulário. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          <ExpensesTable expenses={expenses} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar despesa' : 'Nova despesa'}
        description="Preencha os dados do lançamento de despesa."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        {categories.length === 0 && (
          <InlineAlert>Cadastre ao menos uma categoria de despesa antes de criar despesas.</InlineAlert>
        )}
        <div className="mt-4">
          <ExpenseForm
            initialValue={editing}
            categories={categories}
            suppliers={suppliers}
            accounts={accounts}
            safras={safras}
            isSubmitting={createMutation.isPending || updateMutation.isPending || isAuxLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
