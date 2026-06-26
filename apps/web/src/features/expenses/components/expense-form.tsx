'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, toDateInputValue } from '@/lib/utils'
import type { Account, Category, Expense, Safra, Supplier } from '@/types/api'
import type { ExpensePayload } from '../api'

type EditableExpenseStatus = 'PENDING' | 'PAID'
type FormStatus = EditableExpenseStatus | ''

interface ExpenseFormProps {
  initialValue?: Expense | null
  categories: Category[]
  suppliers: Supplier[]
  accounts: Account[]
  safras: Safra[]
  isSubmitting?: boolean
  onSubmit: (payload: ExpensePayload) => void
  onCancel: () => void
}

export function ExpenseForm({
  initialValue,
  categories,
  suppliers,
  accounts,
  safras,
  isSubmitting,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [safraId, setSafraId] = useState('')
  const [date, setDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [status, setStatus] = useState<FormStatus>('PENDING')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCategoryId(initialValue?.categoryId ?? '')
    setSupplierId(initialValue?.supplierId ?? '')
    setAccountId(initialValue?.accountId ?? '')
    setSafraId(initialValue?.safraId ?? '')
    setDate(toDateInputValue(initialValue?.date) || toDateInputValue(new Date()))
    setDueDate(toDateInputValue(initialValue?.dueDate))
    setPaidAt(toDateInputValue(initialValue?.paidAt))
    setAmount(initialValue ? String(initialValue.amount) : '')
    setDescription(initialValue?.description ?? '')
    setAttachmentUrl(initialValue?.attachmentUrl ?? '')
    setStatus(initialValue?.status === 'OVERDUE' ? '' : initialValue?.status ?? 'PENDING')
    setError(null)
  }, [initialValue])

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'EXPENSE' || category.type === 'BOTH'),
    [categories],
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = Number(amount)
    const shouldPay = status === 'PAID'

    if (!categoryId) {
      setError('Selecione uma categoria.')
      return
    }
    if (!description.trim()) {
      setError('Informe a descrição da despesa.')
      return
    }
    if (!date) {
      setError('Informe a data da despesa.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }
    if (shouldPay && !accountId) {
      setError('Selecione uma conta para despesas pagas.')
      return
    }

    const effectivePaidAt = shouldPay ? paidAt || toDateInputValue(new Date()) : paidAt

    setError(null)
    onSubmit({
      categoryId,
      supplierId: supplierId || null,
      accountId: accountId || null,
      safraId: safraId || null,
      date: dateInputToIso(date)!,
      dueDate: dateInputToIso(dueDate),
      paidAt: dateInputToIso(effectivePaidAt),
      amount: parsedAmount,
      description: description.trim(),
      ...(status ? { status } : {}),
      attachmentUrl: attachmentUrl.trim() ? attachmentUrl.trim() : null,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {initialValue?.status === 'OVERDUE' && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Despesa vencida. Para regularizar, marque como paga.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-category">Categoria</Label>
          <Select
            id="expense-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Selecione</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-supplier">Fornecedor</Label>
          <Select id="expense-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Sem fornecedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-description">Descrição</Label>
        <Input
          id="expense-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="expense-date">Data</Label>
          <Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-due-date">Vencimento</Label>
          <Input id="expense-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-paid-at">Data de pagamento</Label>
          <Input id="expense-paid-at" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Valor</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-status">Status</Label>
          <Select id="expense-status" value={status} onChange={(event) => setStatus(event.target.value as FormStatus)}>
            {initialValue?.status === 'OVERDUE' && <option value="">Manter vencida</option>}
            <option value="PENDING">Pendente</option>
            <option value="PAID">Paga</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
            {formatCurrency(Number(amount) || 0)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-account">Conta {status === 'PAID' ? '*' : ''}</Label>
          <Select
            id="expense-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required={status === 'PAID'}
          >
            <option value="">Sem conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-safra">Safra</Label>
          <Select id="expense-safra" value={safraId} onChange={(event) => setSafraId(event.target.value)}>
            <option value="">Sem safra</option>
            {safras.map((safra) => (
              <option key={safra.id} value={safra.id}>
                {safra.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-attachment">URL do anexo</Label>
        <Textarea
          id="expense-attachment"
          value={attachmentUrl}
          onChange={(event) => setAttachmentUrl(event.target.value)}
        />
      </div>

      {status === 'PAID' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Despesa paga: ao salvar, o valor será debitado do saldo da conta selecionada.
        </div>
      )}

      {initialValue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Alterações de valor, status ou conta ajustam automaticamente o saldo.
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
