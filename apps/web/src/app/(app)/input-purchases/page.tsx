'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import {
  cancelInputPurchase,
  createInputPurchase,
  deleteInputPurchasePermanent,
  listInputPurchases,
  type InputPurchaseStatusFilter,
  type InputPurchasePayload,
} from '@/features/input-purchases/api'
import { InputPurchaseForm } from '@/features/input-purchases/components/input-purchase-form'
import { InputPurchasesTable } from '@/features/input-purchases/components/input-purchases-table'
import { listSuppliers } from '@/features/suppliers/api'
import { listSupplies } from '@/features/supplies/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { InputPurchase } from '@/types/api'

export default function InputPurchasesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InputPurchaseStatusFilter>('ACTIVE')
  const query = useQuery({
    queryKey: ['input-purchases', statusFilter],
    queryFn: () => listInputPurchases(statusFilter),
  })
  const suppliesQuery = useQuery({ queryKey: ['supplies'], queryFn: listSupplies })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const purchases = query.data?.data ?? []
  const supplies = suppliesQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [deletingPermanentId, setDeletingPermanentId] = useState<string | null>(null)

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['input-purchases'] }),
      queryClient.invalidateQueries({ queryKey: ['input-stock'] }),
      queryClient.invalidateQueries({ queryKey: ['input-stock-movements'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createInputPurchase,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Compra de insumo registrada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) => cancelInputPurchase(id, { reason }),
    onMutate: ({ id }) => setCancelingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Compra de insumo cancelada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setCancelingId(null),
  })

  const deletePermanentMutation = useMutation({
    mutationFn: deleteInputPurchasePermanent,
    onMutate: (id: string) => setDeletingPermanentId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Compra cancelada excluída permanentemente.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingPermanentId(null),
  })

  function openCreate() {
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleSubmit(payload: InputPurchasePayload) {
    createMutation.mutate(payload)
  }

  function handleCancel(purchase: InputPurchase) {
    if (purchase.status === 'CANCELED') return
    const confirmed = window.confirm('Cancelar esta compra vai estornar a entrada de estoque. Deseja continuar?')
    if (!confirmed) return

    const reason = window.prompt('Motivo do cancelamento (opcional):')
    if (reason === null) return

    cancelMutation.mutate({ id: purchase.id, reason: reason.trim() || null })
  }

  function handleDeletePermanent(purchase: InputPurchase) {
    if (purchase.status !== 'CANCELED') return

    const confirmed = window.confirm(
      'Esta ação remove definitivamente a compra cancelada e suas movimentações. Use apenas para testes ou lançamentos feitos por engano. Deseja continuar?',
    )
    if (!confirmed) return

    deletePermanentMutation.mutate(purchase.id)
  }

  return (
    <>
      <ListPage
        title="Compras de insumos"
        description="Registre entradas de defensivos, fertilizantes, embalagens e outros insumos."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={purchases.length === 0}
        emptyMessage="Nenhuma compra de insumo registrada. Registre uma compra para alimentar o estoque."
        errorMessage="Não foi possível carregar as compras de insumos."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
        newLabel="Nova compra"
        action={
          <div className="flex w-full rounded-md border p-1 sm:w-auto">
            <Button
              type="button"
              variant={statusFilter === 'ACTIVE' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Ativas
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setStatusFilter('ALL')}
            >
              Todas
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <InputPurchasesTable
            purchases={purchases}
            cancelingId={cancelingId}
            deletingPermanentId={deletingPermanentId}
            onCancel={handleCancel}
            onDeletePermanent={handleDeletePermanent}
          />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title="Nova compra de insumo"
        description="Informe os dados da entrada de estoque."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <InputPurchaseForm
            supplies={supplies}
            suppliers={suppliers}
            isSubmitting={createMutation.isPending || suppliesQuery.isLoading || suppliersQuery.isLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
