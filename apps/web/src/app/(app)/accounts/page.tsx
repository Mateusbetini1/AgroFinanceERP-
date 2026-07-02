'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import { createAccount, deleteAccount, listAccounts, updateAccount, type AccountPayload } from '@/features/accounts/api'
import { AccountForm } from '@/features/accounts/components/account-form'
import { AccountsTable } from '@/features/accounts/components/accounts-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { Account } from '@/types/api'

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const accounts = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Conta criada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<AccountPayload, 'initialBalance'> }) =>
      updateAccount(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Conta atualizada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Conta excluída com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setDeletingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDelete(account: Account) {
    if (!window.confirm(`Excluir a conta "${account.name}"?`)) return
    deleteMutation.mutate(account.id)
  }

  function handleSubmit(payload: AccountPayload) {
    if (editing) {
      const { initialBalance: _initialBalance, ...updatePayload } = payload
      updateMutation.mutate({ id: editing.id, payload: updatePayload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <>
      <ListPage
        title="Contas"
        description="Saldos operacionais e contas financeiras cadastradas."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={accounts.length === 0}
        emptyMessage="Nenhuma conta cadastrada. Cadastre uma conta para controlar saldo e movimentações."
        errorMessage="Não foi possível carregar as contas."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
        newLabel="Nova conta"
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <AccountsTable accounts={accounts} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar conta' : 'Nova conta'}
        description="Preencha os dados da conta. O saldo inicial só é definido na criação."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <AccountForm
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
