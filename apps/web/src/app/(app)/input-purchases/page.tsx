'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { createInputPurchase, listInputPurchases, type InputPurchasePayload } from '@/features/input-purchases/api'
import { InputPurchaseForm } from '@/features/input-purchases/components/input-purchase-form'
import { InputPurchasesTable } from '@/features/input-purchases/components/input-purchases-table'
import { listSuppliers } from '@/features/suppliers/api'
import { listSupplies } from '@/features/supplies/api'
import { getApiErrorMessage } from '@/lib/utils'

export default function InputPurchasesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['input-purchases'], queryFn: listInputPurchases })
  const suppliesQuery = useQuery({ queryKey: ['supplies'], queryFn: listSupplies })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const purchases = query.data?.data ?? []
  const supplies = suppliesQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  function openCreate() {
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleSubmit(payload: InputPurchasePayload) {
    createMutation.mutate(payload)
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
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <InputPurchasesTable purchases={purchases} />
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
