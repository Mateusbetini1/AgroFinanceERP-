'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListFilters } from '@/components/data/list-filters'
import { ListPage } from '@/components/data/list-page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { listAccounts } from '@/features/accounts/api'
import { listProducts } from '@/features/products/api'
import { createRevenue, deleteRevenue, listRevenues, updateRevenue, type RevenuePayload } from '@/features/revenues/api'
import { RevenueForm } from '@/features/revenues/components/revenue-form'
import { RevenuesTable } from '@/features/revenues/components/revenues-table'
import { listSafras } from '@/features/safras/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { Revenue } from '@/types/api'

type RevenueFilterState = {
  search: string
  status: '' | 'PENDING' | 'RECEIVED'
  safraId: string
  month: string
}

function monthBounds(month: string) {
  if (!month) return {}
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1, 12)
  const end = new Date(year, monthNumber, 0, 12)
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

function cleanFilters(filters: RevenueFilterState) {
  return {
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.safraId ? { safraId: filters.safraId } : {}),
    ...monthBounds(filters.month),
  }
}

const initialFilters: RevenueFilterState = { search: '', status: '', safraId: '', month: '' }

export default function RevenuesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<RevenueFilterState>(initialFilters)
  const apiFilters = cleanFilters(filters)
  const hasActiveFilters = Object.keys(apiFilters).length > 0
  const query = useQuery({ queryKey: ['revenues', apiFilters], queryFn: () => listRevenues(apiFilters) })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })

  const revenues = query.data?.data ?? []
  const products = productsQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Revenue | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['revenues'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: createRevenue,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Receita criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RevenuePayload }) => updateRevenue(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Receita atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRevenue,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Receita excluída com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(revenue: Revenue) {
    setEditing(revenue)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(revenue: Revenue) {
    if (!window.confirm(`Excluir a receita de "${revenue.product.name}"?`)) return
    deleteMutation.mutate(revenue.id)
  }

  function handleSubmit(payload: RevenuePayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  const isAuxLoading = productsQuery.isLoading || accountsQuery.isLoading || safrasQuery.isLoading

  return (
    <>
      <ListPage
        title="Receitas"
        description="Vendas e recebimentos cadastrados por produto."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={false}
        emptyMessage="Nenhuma receita encontrada."
        errorMessage="Não foi possível carregar as receitas."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          <ListFilters onClear={() => setFilters(initialFilters)} hasActiveFilters={hasActiveFilters}>
            <div className="space-y-1">
              <Label htmlFor="revenue-search">Busca</Label>
              <Input
                id="revenue-search"
                value={filters.search}
                placeholder="Cliente ou produto"
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="revenue-status">Status</Label>
              <Select
                id="revenue-status"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as RevenueFilterState['status'] }))}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="RECEIVED">Recebidos</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="revenue-safra">Safra</Label>
              <Select
                id="revenue-safra"
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
              <Label htmlFor="revenue-month">Mes</Label>
              <Input
                id="revenue-month"
                type="month"
                value={filters.month}
                onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
              />
            </div>
          </ListFilters>
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {(productsQuery.isError || accountsQuery.isError || safrasQuery.isError) && (
            <InlineAlert>
              Não foi possível carregar todos os campos de apoio do formulário. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          {revenues.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {hasActiveFilters ? 'Nenhum registro encontrado com os filtros atuais.' : 'Nenhuma receita encontrada.'}
            </div>
          ) : (
            <RevenuesTable revenues={revenues} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar receita' : 'Nova receita'}
        description="Preencha os dados da venda ou recebimento."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        {products.length === 0 && (
          <InlineAlert>Cadastre ao menos um produto antes de criar receitas.</InlineAlert>
        )}
        <div className="mt-4">
          <RevenueForm
            initialValue={editing}
            products={products}
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
