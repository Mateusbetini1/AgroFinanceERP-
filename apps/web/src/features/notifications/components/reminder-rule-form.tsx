'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, toDateInputValue } from '@/lib/utils'
import type { ReminderRecurrenceType, ReminderRule, ReminderRulePayload, ReminderRuleType } from '../reminder-api'

const leadDayOptions = [
  { value: 0, label: 'No dia' },
  { value: 1, label: '1 dia antes' },
  { value: 2, label: '2 dias antes' },
  { value: 7, label: '7 dias antes' },
]

const typeLabels: Record<ReminderRuleType, string> = {
  BILL: 'Boleto',
  EXPENSE: 'Despesa',
  REVENUE: 'Receita',
  GENERAL: 'Geral',
}

type FormState = {
  name: string
  type: ReminderRuleType
  recurrenceType: ReminderRecurrenceType
  dayOfMonth: string
  dueDate: string
  leadDays: number[]
  pushEnabled: boolean
  inAppEnabled: boolean
  notes: string
}

function getInitialState(initialValue?: ReminderRule | null): FormState {
  return {
    name: initialValue?.name ?? '',
    type: initialValue?.type ?? 'BILL',
    recurrenceType: initialValue?.recurrenceType ?? 'MONTHLY_DAY',
    dayOfMonth: initialValue?.dayOfMonth ? String(initialValue.dayOfMonth) : '8',
    dueDate: toDateInputValue(initialValue?.dueDate),
    leadDays: initialValue?.leadDays?.length ? initialValue.leadDays : [2, 0],
    pushEnabled: initialValue?.pushEnabled ?? true,
    inAppEnabled: initialValue?.inAppEnabled ?? true,
    notes: initialValue?.notes ?? '',
  }
}

export function ReminderRuleForm({
  initialValue,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialValue?: ReminderRule | null
  isSubmitting?: boolean
  onSubmit: (payload: ReminderRulePayload) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(() => getInitialState(initialValue))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(getInitialState(initialValue))
    setError(null)
  }, [initialValue])

  function toggleLeadDay(value: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      leadDays: checked ? [...current.leadDays, value] : current.leadDays.filter((day) => day !== value),
    }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const leadDays = leadDayOptions.map((option) => option.value).filter((value) => form.leadDays.includes(value))
    if (!form.name.trim()) {
      setError('Informe o nome do lembrete.')
      return
    }
    if (leadDays.length === 0) {
      setError('Selecione pelo menos um aviso.')
      return
    }
    if (form.recurrenceType === 'MONTHLY_DAY' && (!form.dayOfMonth || Number(form.dayOfMonth) < 1 || Number(form.dayOfMonth) > 31)) {
      setError('Informe um dia do mês entre 1 e 31.')
      return
    }
    if (form.recurrenceType === 'ONE_TIME' && !form.dueDate) {
      setError('Informe a data do lembrete.')
      return
    }

    onSubmit({
      name: form.name.trim(),
      type: form.type,
      active: initialValue?.active ?? true,
      recurrenceType: form.recurrenceType,
      dayOfMonth: form.recurrenceType === 'MONTHLY_DAY' ? Number(form.dayOfMonth) : null,
      dueDate: form.recurrenceType === 'ONE_TIME' ? dateInputToIso(form.dueDate) : null,
      leadDays,
      pushEnabled: form.pushEnabled,
      inAppEnabled: form.inAppEnabled,
      notes: form.notes,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="reminder-name">Nome *</Label>
          <Input
            id="reminder-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Faculdade"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder-type">Tipo *</Label>
          <Select
            id="reminder-type"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ReminderRuleType }))}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder-recurrence">Recorrência *</Label>
          <Select
            id="reminder-recurrence"
            value={form.recurrenceType}
            onChange={(event) =>
              setForm((current) => ({ ...current, recurrenceType: event.target.value as ReminderRecurrenceType }))
            }
          >
            <option value="MONTHLY_DAY">Mensal por dia do mês</option>
            <option value="ONE_TIME">Data única</option>
          </Select>
        </div>

        {form.recurrenceType === 'MONTHLY_DAY' ? (
          <div className="space-y-2">
            <Label htmlFor="reminder-day">Dia do mês *</Label>
            <Input
              id="reminder-day"
              type="number"
              min={1}
              max={31}
              value={form.dayOfMonth}
              onChange={(event) => setForm((current) => ({ ...current, dayOfMonth: event.target.value }))}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="reminder-date">Data *</Label>
            <Input
              id="reminder-date"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label>Avisar *</Label>
          <div className="grid gap-2 sm:grid-cols-4">
            {leadDayOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={form.leadDays.includes(option.value)}
                  onChange={(event) => toggleLeadDay(option.value, event.target.checked)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="reminder-notes">Observações</Label>
          <Textarea
            id="reminder-notes"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Mensalidade da faculdade"
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <Checkbox
            checked={form.pushEnabled}
            onChange={(event) => setForm((current) => ({ ...current, pushEnabled: event.target.checked }))}
          />
          Push no celular
        </label>
        <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <Checkbox
            checked={form.inAppEnabled}
            onChange={(event) => setForm((current) => ({ ...current, inAppEnabled: event.target.checked }))}
          />
          Mostrar dentro do app
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar lembrete
        </Button>
      </div>
    </form>
  )
}
