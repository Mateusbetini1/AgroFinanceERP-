'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, toDateInputValue } from '@/lib/utils'
import type { Account, Bill, Supplier } from '@/types/api'
import type { BillPayload } from '../api'

type EditableBillStatus = 'PENDING' | 'PAID'
type FormStatus = EditableBillStatus | ''

interface BillFormProps {
  initialValue?: Bill | null
  suppliers: Supplier[]
  accounts: Account[]
  isSubmitting?: boolean
  onSubmit: (payload: BillPayload) => void
  onCancel: () => void
}

export function BillForm({ initialValue, suppliers, accounts, isSubmitting, onSubmit, onCancel }: BillFormProps) {
  const [supplierId, setSupplierId] = useState('')
  const [accountId, setAccountId] = useState('')
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
    setSupplierId(initialValue?.supplierId ?? '')
    setAccountId(initialValue?.accountId ?? '')
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

  function parsePositiveInteger(value: string, label: string): number | null {
    if (!value.trim()) return null
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError(`${label} deve ser um número inteiro positivo.`)
      return null
    }
    return parsed
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = Number(amount)
    const shouldPay = status === 'PAID'

    if (!description.trim()) {
      setError('Informe a descrição do boleto.')
      return
    }
    if (!dueDate) {
      setError('Informe a data de vencimento.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }
    if (shouldPay && !accountId) {
      setError('Selecione uma conta para boletos pagos.')
      return
    }

    const parsedInstallmentNumber = parsePositiveInteger(installmentNumber, 'Número da parcela')
    if (error || (installmentNumber.trim() && !parsedInstallmentNumber)) return

    const parsedInstallmentCount = parsePositiveInteger(installmentCount, 'Total de parcelas')
    if (error || (installmentCount.trim() && !parsedInstallmentCount)) return

    const effectivePaidAt = shouldPay ? paidAt || toDateInputValue(new Date()) : paidAt

    setError(null)
    onSubmit({
      supplierId: supplierId || null,
      accountId: accountId || null,
      description: description.trim(),
      amount: parsedAmount,
      dueDate: dateInputToIso(dueDate)!,
      paidAt: dateInputToIso(effectivePaidAt),
      ...(status ? { status } : {}),
      fileUrl: fileUrl.trim() ? fileUrl.trim() : null,
      installmentNumber: parsedInstallmentNumber,
      installmentCount: parsedInstallmentCount,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {initialValue?.status === 'OVERDUE' && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Boleto vencido. Para regularizar, marque como pago.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="space-y-2">
          <Label htmlFor="bill-account">Conta {status === 'PAID' ? '*' : ''}</Label>
          <Select
            id="bill-account"
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
          <Label htmlFor="bill-due-date">Vencimento</Label>
          <Input id="bill-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
        </div>

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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bill-amount">Valor</Label>
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
          <Label htmlFor="bill-installment-number">Parcela</Label>
          <Input
            id="bill-installment-number"
            type="number"
            min="1"
            step="1"
            value={installmentNumber}
            onChange={(event) => setInstallmentNumber(event.target.value)}
          />
        </div>

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
      </div>

      <div className="space-y-2">
        <Label>Total</Label>
        <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
          {formatCurrency(Number(amount) || 0)}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bill-file">URL do arquivo</Label>
        <Textarea id="bill-file" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
      </div>

      {status === 'PAID' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Boleto pago: ao salvar, o valor será debitado do saldo da conta selecionada.
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
