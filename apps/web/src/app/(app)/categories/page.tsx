'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { CategoryForm } from '@/features/categories/components/category-form'
import { CategoriesTable } from '@/features/categories/components/categories-table'
import { createCategory, deleteCategory, listCategories, updateCategory, type CategoryPayload } from '@/features/categories/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { Category } from '@/types/api'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const categories = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Categoria criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryPayload }) => updateCategory(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Categoria atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Categoria excluída com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(category: Category) {
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return
    deleteMutation.mutate(category.id)
  }

  function handleSubmit(payload: CategoryPayload) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <>
      <ListPage
        title="Categorias"
        description="Categorias usadas para organizar despesas e relatórios."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={categories.length === 0}
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <CategoriesTable categories={categories} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description="Preencha os dados da categoria."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <CategoryForm
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
