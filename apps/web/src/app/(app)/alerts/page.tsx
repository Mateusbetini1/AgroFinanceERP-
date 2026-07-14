'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { AlertsCenter } from '@/features/notifications/components/alerts-center'
import { PushNotificationCard } from '@/features/notifications/components/push-notification-card'
import { ReminderPreview } from '@/features/notifications/components/reminder-preview'
import { ReminderRuleForm } from '@/features/notifications/components/reminder-rule-form'
import { ReminderRuleList } from '@/features/notifications/components/reminder-rule-list'
import {
  createReminderRule,
  deleteReminderRule,
  getReminderPreview,
  listReminderRules,
  updateReminderRule,
  type ReminderRule,
  type ReminderRulePayload,
} from '@/features/notifications/reminder-api'
import { getApiErrorMessage } from '@/lib/utils'

export default function AlertsPage() {
  const queryClient = useQueryClient()
  const rulesQuery = useQuery({ queryKey: ['notifications', 'reminder-rules'], queryFn: listReminderRules })
  const previewQuery = useQuery({ queryKey: ['notifications', 'reminder-rules', 'preview'], queryFn: getReminderPreview })
  const rules = rulesQuery.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ReminderRule | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function invalidateReminderRules() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications', 'reminder-rules'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications', 'reminder-rules', 'preview'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createReminderRule,
    onSuccess: async () => {
      await invalidateReminderRules()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Lembrete criado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ReminderRulePayload> }) =>
      updateReminderRule(id, payload),
    onSuccess: async () => {
      await invalidateReminderRules()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Lembrete atualizado com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setBusyId(null),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReminderRule,
    onMutate: (id) => setBusyId(id),
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<ReminderRule[]>(['notifications', 'reminder-rules'], (current) =>
        current?.filter((rule) => rule.id !== id) ?? current,
      )
      await invalidateReminderRules()
      setFeedback({ type: 'success', message: 'Lembrete excluido com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
    onSettled: () => setBusyId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(rule: ReminderRule) {
    setEditing(rule)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleSubmit(payload: ReminderRulePayload) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleToggleActive(rule: ReminderRule) {
    setBusyId(rule.id)
    updateMutation.mutate({ id: rule.id, payload: { active: !rule.active } })
  }

  function handleDelete(rule: ReminderRule) {
    if (!window.confirm('Excluir este lembrete? Ele nao aparecera mais na lista.')) return
    deleteMutation.mutate(rule.id)
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Alertas e lembretes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe pendências e configure avisos importantes.</p>
        </header>

        {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}

        <AlertsCenter variant="mobile" className="lg:hidden" />
        <AlertsCenter className="hidden lg:block" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <ReminderRuleList
              rules={rules}
              isLoading={rulesQuery.isLoading}
              isError={rulesQuery.isError}
              busyId={busyId}
              onNew={openCreate}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onRetry={() => void rulesQuery.refetch()}
            />
          </div>

          <aside className="space-y-6">
            <PushNotificationCard />
            <ReminderPreview
              items={previewQuery.data?.items ?? []}
              isLoading={previewQuery.isLoading}
              isError={previewQuery.isError}
            />
          </aside>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar lembrete' : 'Novo lembrete'}
        description="Configure quando este aviso deve aparecer."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <ReminderRuleForm
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
