'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListFilters } from '@/components/data/list-filters'
import { ListPagination } from '@/components/data/list-pagination'
import { ListPage } from '@/components/data/list-page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { listAccounts } from '@/features/accounts/api'
import { listCategories } from '@/features/categories/api'
import { createExpense, deleteExpense, listExpenses, updateExpense, type ExpensePayload } from '@/features/expenses/api'
import { ExpenseForm } from '@/features/expenses/components/expense-form'
import { ExpensesTable } from '@/features/expenses/components/expenses-table'
import { listSafras } from '@/features/safras/api'
import { listSuppliers } from '@/features/suppliers/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { Expense } from '@/types/api'

type ExpenseFilterState = {
  search: string
  status: '' | 'PENDING' | 'PAID' | 'OVERDUE'
  safraId: string
  month: string
}

const initialFilters: ExpenseFilterState = { search: '', status: '', safraId: '', month: '' }
const pageSize = 20

function monthBounds(month: string) {
  if (!month) return {}
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1, 12)
  const end = new Date(year, monthNumber, 0, 12)
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

function cleanFilters(filters: ExpenseFilterState) {
  return {
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.safraId ? { safraId: filters.safraId } : {}),
    ...monthBounds(filters.month),
  }
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ExpenseFilterState>(initialFilters)
  const [searchInput, setSearchInput] = useState(initialFilters.search)
  const [page, setPage] = useState(1)
  const apiFilters = cleanFilters(filters)
  const queryParams = { ...apiFilters, page, limit: pageSize }
  const hasActiveFilters = Object.keys(apiFilters).length > 0 || searchInput.trim().length > 0
  const query = useQuery({ queryKey: ['expenses', queryParams], queryFn: () => listExpenses(queryParams) })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })

  const expenses = query.data?.data ?? []
  const pagination = query.data?.meta
  const categories = categoriesQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      setFilters((current) => (current.search === searchInput ? current : { ...current, search: searchInput }))
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

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
      setFeedback({ type: 'success', message: 'Despesa excluida com sucesso.' })
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

  function clearFilters() {
    setPage(1)
    setSearchInput(initialFilters.search)
    setFilters(initialFilters)
  }

  function updateFilters(updater: (current: ExpenseFilterState) => ExpenseFilterState) {
    setPage(1)
    setFilters(updater)
  }

  const isAuxLoading =
    categoriesQuery.isLoading || suppliersQuery.isLoading || accountsQuery.isLoading || safrasQuery.isLoading
  const hasAuxError = categoriesQuery.isError || suppliersQuery.isError || accountsQuery.isError || safrasQuery.isError

  return (
    <>
      <ListPage
        title="Despesas"
        description="Despesas operacionais e financeiras lancadas."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={false}
        emptyMessage="Nenhuma despesa encontrada."
        errorMessage="Nao foi possivel carregar as despesas."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          <ListFilters onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
            <div className="space-y-1">
              <Label htmlFor="expense-search">Busca</Label>
              <Input
                id="expense-search"
                value={searchInput}
                placeholder="Descricao, fornecedor ou categoria"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-status">Status</Label>
              <Select
                id="expense-status"
                value={filters.status}
                onChange={(event) => updateFilters((current) => ({ ...current, status: event.target.value as ExpenseFilterState['status'] }))}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="PAID">Pagas</option>
                <option value="OVERDUE">Vencidas</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-safra">Safra</Label>
              <Select
                id="expense-safra"
                value={filters.safraId}
                onChange={(event) => updateFilters((current) => ({ ...current, safraId: event.target.value }))}
              >
                <option value="">Todas</option>
                {safras.map((safra) => (
                  <option key={safra.id} value={safra.id}>
                    {safra.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-month">Mes</Label>
              <Input
                id="expense-month"
                type="month"
                value={filters.month}
                onChange={(event) => updateFilters((current) => ({ ...current, month: event.target.value }))}
              />
            </div>
          </ListFilters>

          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Nao foi possivel carregar todos os campos de apoio do formulario. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          {expenses.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {hasActiveFilters ? 'Nenhum registro encontrado com os filtros atuais.' : 'Nenhuma despesa encontrada.'}
            </div>
          ) : (
            <>
              <ExpensesTable expenses={expenses} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
              {pagination && (
                <ListPagination
                  page={pagination.page}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  isFetching={query.isFetching}
                  itemLabel="despesas"
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar despesa' : 'Nova despesa'}
        description="Preencha os dados do lancamento de despesa."
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
