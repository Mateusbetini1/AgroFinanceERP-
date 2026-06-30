'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, formatDate, toDateInputValue } from '@/lib/utils'
import type { Account, Bill, Category, Safra, Supplier } from '@/types/api'
import type { BillInstallmentsPayload, BillPayload } from '../api'

type EditableBillStatus = 'PENDING' | 'PAID'
type FormStatus = EditableBillStatus | ''
type CreateMode = 'single' | 'installments'

export type BillFormSubmit =
  | { mode: 'single'; payload: BillPayload }
  | { mode: 'installments'; payload: BillInstallmentsPayload }

interface BillFormProps {
  initialValue?: Bill | null
  suppliers: Supplier[]
  accounts: Account[]
  categories: Category[]
  safras: Safra[]
  isSubmitting?: boolean
  onSubmit: (payload: BillFormSubmit) => void
  onCancel: () => void
}

function distributeAmounts(totalAmount: number, installmentCount: number): number[] {
  const totalCents = Math.round(totalAmount * 100)
  const baseCents = Math.floor(totalCents / installmentCount)
  const remainderCents = totalCents % installmentCount

  return Array.from({ length: installmentCount }, (_, index) => {
    const cents = baseCents + (index === installmentCount - 1 ? remainderCents : 0)
    return cents / 100
  })
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

export function BillForm({ initialValue, suppliers, accounts, categories, safras, isSubmitting, onSubmit, onCancel }: BillFormProps) {
  const [mode, setMode] = useState<CreateMode>('single')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [safraId, setSafraId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [status, setStatus] = useState<FormStatus>('PENDING')
  const [fileUrl, setFileUrl] = useState('')
  const [installmentNumber, setInstallmentNumber] = useState('')
  const [installmentCount, setInstallmentCount] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMode('single')
    setCategoryId(initialValue?.categoryId ?? '')
    setSupplierId(initialValue?.supplierId ?? '')
    setAccountId(initialValue?.accountId ?? '')
    setSafraId(initialValue?.safraId ?? '')
    setDescription(initialValue?.description ?? '')
    setAmount(initialValue ? String(initialValue.amount) : '')
    setDueDate(toDateInputValue(initialValue?.dueDate) || toDateInputValue(new Date()))
    setPaidAt(toDateInputValue(initialValue?.paidAt))
    setStatus(initialValue?.status === 'OVERDUE' ? '' : initialValue?.status ?? 'PENDING')
    setFileUrl(initialValue?.fileUrl ?? '')
    setInstallmentNumber(initialValue?.installmentNumber ? String(initialValue.installmentNumber) : '')
    setInstallmentCount(initialValue?.installmentCount ? String(initialValue.installmentCount) : '')
    setError(null)
  }, [initialValue])

  const installmentPreview = useMemo(() => {
    if (mode !== 'installments') return []
    const total = Number(amount)
    const count = Number(installmentCount)
    const firstDueDate = parseDateInput(dueDate)

    if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(count) || count < 2 || !firstDueDate) {
      return []
    }

    const amounts = distributeAmounts(total, count)
    return amounts.map((installmentAmount, index) => ({
      number: index + 1,
      amount: installmentAmount,
      dueDate: addMonthsClamped(firstDueDate, index),
    }))
  }, [amount, dueDate, installmentCount, mode])

  function parsePositiveInteger(value: string, label: string, required = false): number | null {
    if (!value.trim()) {
      if (required) setError(`${label} é obrigatório.`)
      return null
    }

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError(`${label} deve ser um número inteiro positivo.`)
      return null
    }
    return parsed
  }

  function validateBaseFields(parsedAmount: number) {
    if (!description.trim()) {
      setError('Informe a descrição do boleto.')
      return false
    }
    if (!dueDate) {
      setError(mode === 'installments' ? 'Informe o primeiro vencimento.' : 'Informe a data de vencimento.')
      return false
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero.')
      return false
    }
    return true
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!validateBaseFields(parsedAmount)) return

    if (mode === 'installments' && !initialValue) {
      const parsedInstallmentCount = parsePositiveInteger(installmentCount, 'Quantidade de parcelas', true)
      if (!parsedInstallmentCount || parsedInstallmentCount < 2) {
        setError('Quantidade de parcelas deve ser no mínimo 2.')
        return
      }

      onSubmit({
        mode: 'installments',
        payload: {
          categoryId: categoryId || undefined,
          supplierId: supplierId || undefined,
          accountId: accountId || undefined,
          safraId: safraId || undefined,
          description: description.trim(),
          totalAmount: parsedAmount,
          installmentCount: parsedInstallmentCount,
          firstDueDate: dateInputToIso(dueDate)!,
          fileUrl: fileUrl.trim() || undefined,
        },
      })
      return
    }

    const shouldPay = status === 'PAID'
    if (shouldPay && !accountId) {
      setError('Selecione uma conta para boletos pagos.')
      return
    }

    const parsedInstallmentNumber = parsePositiveInteger(installmentNumber, 'Número da parcela')
    if (installmentNumber.trim() && !parsedInstallmentNumber) return

    const parsedInstallmentCount = parsePositiveInteger(installmentCount, 'Total de parcelas')
    if (installmentCount.trim() && !parsedInstallmentCount) return

    const effectivePaidAt = shouldPay ? paidAt || toDateInputValue(new Date()) : paidAt

    onSubmit({
      mode: 'single',
      payload: {
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        accountId: accountId || null,
        safraId: safraId || null,
        description: description.trim(),
        amount: parsedAmount,
        dueDate: dateInputToIso(dueDate)!,
        paidAt: dateInputToIso(effectivePaidAt),
        ...(status ? { status } : {}),
        fileUrl: fileUrl.trim() ? fileUrl.trim() : null,
        installmentNumber: parsedInstallmentNumber,
        installmentCount: parsedInstallmentCount,
      },
    })
  }

  const isInstallmentsMode = mode === 'installments' && !initialValue

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {!initialValue && (
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-1">
          <Button
            type="button"
            variant={mode === 'single' ? 'default' : 'ghost'}
            onClick={() => setMode('single')}
          >
            Boleto único
          </Button>
          <Button
            type="button"
            variant={mode === 'installments' ? 'default' : 'ghost'}
            onClick={() => setMode('installments')}
          >
            Parcelado
          </Button>
        </div>
      )}

      {initialValue?.status === 'OVERDUE' && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Boleto vencido. Para regularizar, marque como pago.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bill-category">Categoria</Label>
          <Select id="bill-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
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
          <Label htmlFor="bill-supplier">Fornecedor</Label>
          <Select id="bill-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
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
          <Label htmlFor="bill-account">{isInstallmentsMode ? 'Conta prevista' : `Conta ${status === 'PAID' ? '*' : ''}`}</Label>
          <Select
            id="bill-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required={!isInstallmentsMode && status === 'PAID'}
          >
            <option value="">Sem conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.currentBalance)})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-safra">Safra/Ciclo produtivo</Label>
          <Select id="bill-safra" value={safraId} onChange={(event) => setSafraId(event.target.value)}>
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

      <div className="space-y-2">
        <Label htmlFor="bill-description">Descrição</Label>
        <Input
          id="bill-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bill-due-date">{isInstallmentsMode ? 'Primeiro vencimento' : 'Vencimento'}</Label>
          <Input id="bill-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
        </div>

        {!isInstallmentsMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bill-paid-at">Data de pagamento</Label>
              <Input id="bill-paid-at" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-status">Status</Label>
              <Select id="bill-status" value={status} onChange={(event) => setStatus(event.target.value as FormStatus)}>
                {initialValue?.status === 'OVERDUE' && <option value="">Manter vencido</option>}
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bill-amount">{isInstallmentsMode ? 'Valor total' : 'Valor'}</Label>
          <Input
            id="bill-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-installment-number">{isInstallmentsMode ? 'Quantidade de parcelas' : 'Parcela'}</Label>
          <Input
            id="bill-installment-number"
            type="number"
            min={isInstallmentsMode ? '2' : '1'}
            step="1"
            value={isInstallmentsMode ? installmentCount : installmentNumber}
            onChange={(event) =>
              isInstallmentsMode
                ? setInstallmentCount(event.target.value)
                : setInstallmentNumber(event.target.value)
            }
            required={isInstallmentsMode}
          />
        </div>

        {!isInstallmentsMode && (
          <div className="space-y-2">
            <Label htmlFor="bill-installment-count">Total de parcelas</Label>
            <Input
              id="bill-installment-count"
              type="number"
              min="1"
              step="1"
              value={installmentCount}
              onChange={(event) => setInstallmentCount(event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{isInstallmentsMode ? 'Total parcelado' : 'Total'}</Label>
        <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
          {formatCurrency(Number(amount) || 0)}
        </div>
      </div>

      {isInstallmentsMode && installmentPreview.length > 0 && (
        <div className="rounded-md border">
          <div className="border-b px-3 py-2 text-sm font-medium">Prévia das parcelas</div>
          <div className="divide-y">
            {installmentPreview.map((installment) => (
              <div key={installment.number} className="grid grid-cols-3 gap-3 px-3 py-2 text-sm">
                <span>Parcela {installment.number}/{installmentPreview.length}</span>
                <span>{formatDate(installment.dueDate)}</span>
                <span className="text-right font-medium">{formatCurrency(installment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="bill-file">URL do arquivo</Label>
        <Textarea id="bill-file" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
      </div>

      {isInstallmentsMode && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          As parcelas serão criadas como pendentes. Elas entram na projeção e não alteram o saldo atual até serem pagas.
        </div>
      )}

      {!isInstallmentsMode && status === 'PAID' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Boleto pago: ao salvar, o valor será debitado do saldo da conta selecionada.
        </div>
      )}

      {initialValue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Alterações de valor, status ou conta ajustam automaticamente o saldo desta parcela.
        </div>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Use Boletos para compromissos a pagar. Use Despesas para despesas lançadas diretamente. Evite lançar o mesmo gasto nos dois lugares.
      </div>

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
