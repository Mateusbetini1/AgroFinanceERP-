'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier, type SupplierPayload } from '@/features/suppliers/api'
import { SupplierForm } from '@/features/suppliers/components/supplier-form'
import { SuppliersTable } from '@/features/suppliers/components/suppliers-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Supplier } from '@/types/api'

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const suppliers = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  }

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Fornecedor criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) => updateSupplier(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Fornecedor atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Fornecedor excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(supplier: Supplier) {
    if (!window.confirm(`Excluir o fornecedor "${supplier.name}"?`)) return
    deleteMutation.mutate(supplier.id)
  }

  function handleSubmit(payload: SupplierPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Fornecedores"
        description="Fornecedores usados em despesas, boletos e relatórios."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={suppliers.length === 0}
        emptyMessage="Nenhum fornecedor cadastrado."
        errorMessage="Não foi possível carregar os fornecedores."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <SuppliersTable suppliers={suppliers} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        description="Preencha os dados do fornecedor."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <SupplierForm
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
