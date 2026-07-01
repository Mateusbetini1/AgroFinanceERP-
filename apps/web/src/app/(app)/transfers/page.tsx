'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { listAccounts } from '@/features/accounts/api'
import { createTransfer, deleteTransfer, listTransfers, updateTransfer, type TransferPayload } from '@/features/transfers/api'
import { TransferForm } from '@/features/transfers/components/transfer-form'
import { TransfersTable } from '@/features/transfers/components/transfers-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Transfer } from '@/types/api'

export default function TransfersPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['transfers'], queryFn: listTransfers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const transfers = query.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transfer | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transfers'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Transferência criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransferPayload }) => updateTransfer(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Transferência atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTransfer,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Transferência excluída com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(transfer: Transfer) {
    setEditing(transfer)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(transfer: Transfer) {
    if (!window.confirm(`Excluir a transferência de ${transfer.fromAccount.name} para ${transfer.toAccount.name}?`)) return
    deleteMutation.mutate(transfer.id)
  }

  function handleSubmit(payload: TransferPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Transferências"
        description="Movimentações entre contas financeiras."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={transfers.length === 0}
        emptyMessage="Nenhuma transferência encontrada."
        errorMessage="Não foi possível carregar as transferências."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          {accountsQuery.isError && (
            <InlineAlert>Não foi possível carregar as contas. Tente novamente antes de cadastrar.</InlineAlert>
          )}
          <TransfersTable transfers={transfers} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar transferência' : 'Nova transferência'}
        description="Preencha os dados da movimentação entre contas."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        {accounts.length < 2 && <InlineAlert>Cadastre ao menos duas contas antes de criar transferências.</InlineAlert>}
        <div className="mt-4">
          <TransferForm
            initialValue={editing}
            accounts={accounts}
            isSubmitting={createMutation.isPending || updateMutation.isPending || accountsQuery.isLoading}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
