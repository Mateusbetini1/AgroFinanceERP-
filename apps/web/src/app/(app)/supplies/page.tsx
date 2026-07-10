'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { createSupply, deleteSupply, listSupplies, updateSupply, type SupplyPayload } from '@/features/supplies/api'
import { SupplyForm } from '@/features/supplies/components/supply-form'
import { SuppliesTable } from '@/features/supplies/components/supplies-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Supply } from '@/types/api'

export default function SuppliesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['supplies'], queryFn: listSupplies })
  const supplies = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supply | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['supplies'] })
  }

  const createMutation = useMutation({
    mutationFn: createSupply,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Insumo criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplyPayload }) => updateSupply(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Insumo atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupply,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Insumo excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(supply: Supply) {
    setEditing(supply)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(supply: Supply) {
    if (!window.confirm(`Excluir o insumo "${supply.name}"?`)) return
    deleteMutation.mutate(supply.id)
  }

  function handleSubmit(payload: SupplyPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Insumos"
        description="Cadastre defensivos, fertilizantes, embalagens e outros itens de estoque."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={supplies.length === 0}
        emptyMessage="Nenhum insumo cadastrado. Cadastre insumos para preparar o controle de estoque."
        errorMessage="Não foi possível carregar os insumos."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
        newLabel="Novo insumo"
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <SuppliesTable supplies={supplies} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar insumo' : 'Novo insumo'}
        description="Preencha os dados do insumo."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <SupplyForm
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
