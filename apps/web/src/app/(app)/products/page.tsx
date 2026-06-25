'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listCategories } from '@/features/categories/api'
import { createProduct, deleteProduct, listProducts, updateProduct, type ProductPayload } from '@/features/products/api'
import { ProductForm } from '@/features/products/components/product-form'
import { ProductsTable } from '@/features/products/components/products-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Product } from '@/types/api'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const products = query.data?.data ?? []
  const categories = categoriesQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Produto criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) => updateProduct(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Produto atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Produto excluído com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(product: Product) {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) return
    deleteMutation.mutate(product.id)
  }

  function handleSubmit(payload: ProductPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Produtos"
        description="Produtos agrícolas usados em receitas, safras e relatórios."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={products.length === 0}
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <ProductsTable products={products} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar produto' : 'Novo produto'}
        description="Preencha os dados do produto."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <ProductForm
            initialValue={editing}
            categories={categories}
            isSubmitting={createMutation.isPending || updateMutation.isPending || categoriesQuery.isLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
