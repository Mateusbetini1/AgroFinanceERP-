'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listAccounts } from '@/features/accounts/api'
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
import { getApiErrorMessage } from '@/lib/utils'
import type { Bill } from '@/types/api'

export default function BillsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['bills'], queryFn: listBills })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const bills = query.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []

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

  const isAuxLoading = suppliersQuery.isLoading || accountsQuery.isLoading
  const hasAuxError = suppliersQuery.isError || accountsQuery.isError

  return (
    <>
      <ListPage
        title="Boletos"
        description="Boletos pendentes, pagos e vencidos."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={bills.length === 0}
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {hasAuxError && (
            <InlineAlert>
              Não foi possível carregar todos os campos de apoio do formulário. Tente novamente antes de cadastrar.
            </InlineAlert>
          )}
          <BillsTable bills={bills} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

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
