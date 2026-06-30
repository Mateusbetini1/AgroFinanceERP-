'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { dateInputToIso, formatCurrency, formatDate, toDateInputValue } from '@/lib/utils'
import type { Account, Category, Safra, Supplier } from '@/types/api'
import type { BillRecurringPayload } from '../api'

interface BillRecurringFormProps {
  suppliers: Supplier[]
  accounts: Account[]
  categories: Category[]
  safras: Safra[]
  isSubmitting?: boolean
  onSubmit: (payload: BillRecurringPayload) => void
}

function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12)
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetYear = date.getFullYear()
  const targetMonth = date.getMonth() + months
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const targetDay = Math.min(date.getDate(), lastDayOfTargetMonth)
  return new Date(targetYear, targetMonth, targetDay, 12)
}

export function BillRecurringForm({ suppliers, accounts, categories, safras, isSubmitting, onSubmit }: BillRecurringFormProps) {
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [safraId, setSafraId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [firstDueDate, setFirstDueDate] = useState(toDateInputValue(new Date()))
  const [months, setMonths] = useState('12')
  const [skipExisting, setSkipExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)
  const selectedAccount = accounts.find((account) => account.id === accountId)
  const selectedCategory = categories.find((category) => category.id === categoryId)
  const selectedSafra = safras.find((safra) => safra.id === safraId)

  const preview = useMemo(() => {
    const parsedAmount = Number(amount)
    const parsedMonths = Number(months)
    const parsedDate = parseDateInput(firstDueDate)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return []
    if (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) return []
    if (!parsedDate) return []

    return Array.from({ length: parsedMonths }, (_, index) => ({
      number: index + 1,
      dueDate: addMonthsClamped(parsedDate, index),
      amount: parsedAmount,
    }))
  }, [amount, firstDueDate, months])

  function applyQuickMonths(value: number) {
    setMonths(String(value))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    const parsedMonths = Number(months)

    if (!description.trim()) {
      setError('Informe a descricao.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor estimado deve ser maior que zero.')
      return
    }
    if (!firstDueDate) {
      setError('Informe o primeiro vencimento.')
      return
    }
    if (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) {
      setError('Quantidade de meses deve ser um numero inteiro entre 1 e 24.')
      return
    }

    onSubmit({
      categoryId: categoryId || undefined,
      supplierId: supplierId || undefined,
      accountId: accountId || undefined,
      safraId: safraId || undefined,
      description: description.trim(),
      amount: parsedAmount,
      firstDueDate: dateInputToIso(firstDueDate)!,
      months: parsedMonths,
      skipExisting,
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recurring-description">Descricao</Label>
          <Input
            id="recurring-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Energia eletrica"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-amount">Valor estimado</Label>
          <Input
            id="recurring-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recurring-category">Categoria</Label>
          <Select id="recurring-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Sem categoria</option>
            {categories
              .filter((category) => category.active && (category.type === 'EXPENSE' || category.type === 'BOTH'))
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-supplier">Fornecedor</Label>
          <Select id="recurring-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Sem fornecedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="recurring-account">Conta prevista</Label>
          <Select id="recurring-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Sem conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.currentBalance)})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-safra">Safra/Ciclo produtivo</Label>
          <Select id="recurring-safra" value={safraId} onChange={(event) => setSafraId(event.target.value)}>
            <option value="">Sem safra</option>
            {safras
              .filter((safra) => safra.active)
              .map((safra) => (
                <option key={safra.id} value={safra.id}>
                  {safra.name}
                </option>
              ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="recurring-first-due-date">Primeiro vencimento</Label>
          <Input
            id="recurring-first-due-date"
            type="date"
            value={firstDueDate}
            onChange={(event) => setFirstDueDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-months">Quantidade de meses</Label>
          <Input
            id="recurring-months"
            type="number"
            min="1"
            max="24"
            step="1"
            value={months}
            onChange={(event) => setMonths(event.target.value)}
            required
          />
        </div>

        <div className="flex items-end gap-2">
          {[6, 12, 18].map((value) => (
            <Button key={value} type="button" variant="outline" size="sm" onClick={() => applyQuickMonths(value)}>
              {value}
            </Button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={skipExisting}
          onChange={(event) => setSkipExisting(event.target.checked)}
        />
        <span>
          Ignorar boletos ja existentes com mesma descricao, valor, vencimento, fornecedor e conta prevista.
        </span>
      </label>

      {preview.length > 0 && (
        <div className="rounded-md border">
          <div className="border-b px-3 py-2 text-sm font-medium">Previa dos boletos</div>
          <div className="divide-y">
            {preview.map((item) => (
              <div key={item.number} className="grid grid-cols-4 gap-3 px-3 py-2 text-sm">
                <span>#{item.number}</span>
                <span>{formatDate(item.dueDate)}</span>
                <span>{selectedSupplier?.name ?? '-'}</span>
                <span className="text-right font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            Categoria: {selectedCategory?.name ?? 'Sem categoria'} | Safra: {selectedSafra?.name ?? 'Sem safra'} | Conta prevista: {selectedAccount?.name ?? 'Sem conta'}
          </div>
        </div>
      )}

      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Esta ferramenta gera boletos futuros pendentes em lote. Nesta versao, nenhuma regra recorrente fica salva para
        geracao automatica futura. Cada boleto gerado pode ser editado, pago ou excluido individualmente.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Gerar boletos
        </Button>
      </div>
    </form>
  )
}
