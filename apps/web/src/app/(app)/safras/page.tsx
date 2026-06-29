'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listFarmLocations } from '@/features/farm-locations/api'
import { listProducts } from '@/features/products/api'
import { createSafra, deleteSafra, listSafras, updateSafra, type SafraPayload } from '@/features/safras/api'
import { SafraForm } from '@/features/safras/components/safra-form'
import { SafrasTable } from '@/features/safras/components/safras-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Safra } from '@/types/api'

export default function SafrasPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['safras'], queryFn: listSafras })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const farmLocationsQuery = useQuery({
    queryKey: ['farm-locations', { active: true }],
    queryFn: () => listFarmLocations({ active: true }),
  })

  const safras = query.data?.data ?? []
  const products = productsQuery.data?.data ?? []
  const farmLocations = farmLocationsQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Safra | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['safras'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    await queryClient.invalidateQueries({ queryKey: ['revenues'] })
    await queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  const createMutation = useMutation({
    mutationFn: createSafra,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Safra criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SafraPayload }) => updateSafra(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Safra atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSafra,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Safra excluida com sucesso.' })
    },
    onError: (error) =>
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(
          error,
          'Nao foi possivel excluir a safra. Verifique se ha receitas ou despesas vinculadas.',
        ),
      }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(safra: Safra) {
    setEditing(safra)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(safra: Safra) {
    if (!window.confirm(`Excluir a safra "${safra.name}"?`)) return
    deleteMutation.mutate(safra.id)
  }

  function handleSubmit(payload: SafraPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  const isAuxLoading = productsQuery.isLoading || farmLocationsQuery.isLoading
  const hasAuxError = productsQuery.isError || farmLocationsQuery.isError

  return (
    <>
      <ListPage
        title="Safras"
        description="Ciclos de producao rural por produto, local, periodo e status."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={safras.length === 0}
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Nao foi possivel carregar todos os campos de apoio do formulario. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          <SafrasTable safras={safras} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar safra' : 'Nova safra'}
        description="Preencha os dados do ciclo de producao."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        {products.length === 0 && <InlineAlert>Cadastre ao menos um produto antes de criar safras.</InlineAlert>}
        <div className="mt-4">
          <SafraForm
            initialValue={editing}
            products={products}
            farmLocations={farmLocations}
            isSubmitting={createMutation.isPending || updateMutation.isPending || isAuxLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
