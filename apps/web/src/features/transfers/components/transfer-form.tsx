'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, toDateInputValue } from '@/lib/utils'
import type { Account, Transfer } from '@/types/api'
import type { TransferPayload } from '../api'

interface TransferFormProps {
  initialValue?: Transfer | null
  accounts: Account[]
  isSubmitting?: boolean
  onSubmit: (payload: TransferPayload) => void
  onCancel: () => void
}

function accountLabel(account: Account) {
  return `${account.name} - ${formatCurrency(account.currentBalance)}`
}

export function TransferForm({ initialValue, accounts, isSubmitting, onSubmit, onCancel }: TransferFormProps) {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFromAccountId(initialValue?.fromAccountId ?? '')
    setToAccountId(initialValue?.toAccountId ?? '')
    setAmount(initialValue ? String(initialValue.amount) : '')
    setDate(toDateInputValue(initialValue?.date) || toDateInputValue(new Date()))
    setDescription(initialValue?.description ?? '')
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = Number(amount)

    if (!fromAccountId) {
      setError('Selecione a conta de origem.')
      return
    }
    if (!toAccountId) {
      setError('Selecione a conta de destino.')
      return
    }
    if (fromAccountId === toAccountId) {
      setError('Conta de origem e destino devem ser diferentes.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }
    if (!date) {
      setError('Informe a data da transferência.')
      return
    }

    const trimmedDescription = description.trim()

    if (!initialValue) {
      setError(null)
      onSubmit({
        fromAccountId,
        toAccountId,
        amount: parsedAmount,
        date: dateInputToIso(date)!,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      })
      return
    }

    const payload: TransferPayload = {}

    if (fromAccountId !== initialValue.fromAccountId) payload.fromAccountId = fromAccountId
    if (toAccountId !== initialValue.toAccountId) payload.toAccountId = toAccountId
    if (parsedAmount !== Number(initialValue.amount)) payload.amount = parsedAmount
    if (date !== toDateInputValue(initialValue.date)) payload.date = dateInputToIso(date)!
    if (trimmedDescription !== (initialValue.description ?? '')) {
      payload.description = trimmedDescription || null
    }

    if (Object.keys(payload).length === 0) {
      setError('Altere ao menos um campo antes de salvar.')
      return
    }

    setError(null)
    onSubmit(payload)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transfer-from">Conta de origem</Label>
          <Select
            id="transfer-from"
            value={fromAccountId}
            onChange={(event) => setFromAccountId(event.target.value)}
            required
          >
            <option value="">Selecione</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-to">Conta de destino</Label>
          <Select id="transfer-to" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} required>
            <option value="">Selecione</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transfer-amount">Valor</Label>
          <Input
            id="transfer-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-date">Data</Label>
          <Input id="transfer-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Total</Label>
        <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
          {formatCurrency(Number(amount) || 0)}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-description">Descrição</Label>
        <Textarea
          id="transfer-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Transferência: ao salvar, o valor será debitado da conta de origem e creditado na conta de destino.
      </div>

      {initialValue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Alterações de valor ou contas revertem a transferência anterior e aplicam a nova.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
