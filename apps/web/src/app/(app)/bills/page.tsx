'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ListChecks, Plus } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListFilters } from '@/components/data/list-filters'
import { ListPage } from '@/components/data/list-page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { listAccounts } from '@/features/accounts/api'
import { listCategories } from '@/features/categories/api'
import {
  createBill,
  createBillInstallments,
  deleteBill,
  listBills,
  updateBill,
  type BillPayload,
} from '@/features/bills/api'
import { BillForm, type BillFormSubmit } from '@/features/bills/components/bill-form'
import { BillsTable } from '@/features/bills/components/bills-table'
import { listSuppliers } from '@/features/suppliers/api'
import { listSafras } from '@/features/safras/api'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Bill } from '@/types/api'

type BillFilterState = {
  search: string
  status: '' | 'PENDING' | 'PAID' | 'OVERDUE'
  safraId: string
  month: string
}

const initialFilters: BillFilterState = { search: '', status: '', safraId: '', month: '' }

function monthBounds(month: string) {
  if (!month) return {}
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1, 12)
  const end = new Date(year, monthNumber, 0, 12)
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

function cleanFilters(filters: BillFilterState) {
  return {
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.safraId ? { safraId: filters.safraId } : {}),
    ...monthBounds(filters.month),
  }
}

export default function BillsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<BillFilterState>(initialFilters)
  const apiFilters = cleanFilters(filters)
  const hasActiveFilters = Object.keys(apiFilters).length > 0
  const query = useQuery({ queryKey: ['bills', apiFilters], queryFn: () => listBills(apiFilters) })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })

  const bills = query.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const categories = categoriesQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bills'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: createBill,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Boleto criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const createInstallmentsMutation = useMutation({
    mutationFn: createBillInstallments,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Parcelamento criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BillPayload }) => updateBill(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Boleto atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBill,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Boleto excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(bill: Bill) {
    setEditing(bill)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(bill: Bill) {
    if (!window.confirm(`Excluir o boleto "${bill.description}"?`)) return
    deleteMutation.mutate(bill.id)
  }

  function handleSubmit(submission: BillFormSubmit) {
    if (editing) {
      if (submission.mode === 'single') updateMutation.mutate({ id: editing.id, payload: submission.payload })
      return
    }

    if (submission.mode === 'installments') createInstallmentsMutation.mutate(submission.payload)
    else createMutation.mutate(submission.payload)
  }

  const isAuxLoading = suppliersQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading || safrasQuery.isLoading
  const hasAuxError = suppliersQuery.isError || accountsQuery.isError || categoriesQuery.isError || safrasQuery.isError

  return (
    <>
      <div className="[&>div>div:first-child>div:last-child]:hidden md:[&>div>div:first-child>div:last-child]:flex">
        <ListPage
        title="Boletos"
        description="Contas individuais a pagar, pendentes, pagas ou vencidas."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={false}
        emptyMessage="Nenhum boleto encontrado."
        errorMessage="Não foi possível carregar os boletos."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
        action={
          <Link
            href="/bills/recurring"
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <CalendarPlus className="h-4 w-4" />
            Gerar recorrentes
          </Link>
        }
      >
        <div className="space-y-4">
          <ListFilters onClear={() => setFilters(initialFilters)} hasActiveFilters={hasActiveFilters}>
            <div className="space-y-1">
              <Label htmlFor="bill-search">Busca</Label>
              <Input
                id="bill-search"
                value={filters.search}
                placeholder="Descricao ou fornecedor"
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bill-status">Status</Label>
              <Select
                id="bill-status"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as BillFilterState['status'] }))}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="PAID">Pagos</option>
                <option value="OVERDUE">Vencidos</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bill-safra">Safra</Label>
              <Select
                id="bill-safra"
                value={filters.safraId}
                onChange={(event) => setFilters((current) => ({ ...current, safraId: event.target.value }))}
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
              <Label htmlFor="bill-month">Mes de vencimento</Label>
              <Input
                id="bill-month"
                type="month"
                value={filters.month}
                onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
              />
            </div>
          </ListFilters>

          <div className="grid gap-2 md:hidden">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Novo boleto
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/bills/installments"
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium',
                  'transition-colors hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <ListChecks className="h-4 w-4" />
                Parcelamentos
              </Link>
              <Link
                href="/bills/recurring"
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium',
                  'transition-colors hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <CalendarPlus className="h-4 w-4" />
                Recorrentes
              </Link>
            </div>
          </div>

          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Não foi possível carregar todos os campos de apoio do formulário. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          {bills.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {hasActiveFilters ? 'Nenhum registro encontrado com os filtros atuais.' : 'Nenhum boleto encontrado.'}
            </div>
          ) : (
            <BillsTable bills={bills} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
        </ListPage>
      </div>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar boleto' : 'Novo boleto'}
        description="Preencha os dados do boleto."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <BillForm
            initialValue={editing}
            suppliers={suppliers}
            accounts={accounts}
            categories={categories}
            safras={safras}
            isSubmitting={
              createMutation.isPending ||
              createInstallmentsMutation.isPending ||
              updateMutation.isPending ||
              isAuxLoading
            }
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
