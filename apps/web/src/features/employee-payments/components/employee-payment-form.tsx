'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, formatPaymentType, toDateInputValue } from '@/lib/utils'
import type { Account, Employee, EmployeePayment, PaymentType } from '@/types/api'
import type { EmployeePaymentPayload } from '../api'

interface EmployeePaymentFormProps {
  initialValue?: EmployeePayment | null
  employees: Employee[]
  accounts: Account[]
  isSubmitting?: boolean
  onSubmit: (payload: EmployeePaymentPayload) => void
  onCancel: () => void
}

const paymentTypes: PaymentType[] = ['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE']

function accountLabel(account: Account) {
  return `${account.name} - ${formatCurrency(account.currentBalance)}`
}

function getCurrentReference() {
  const now = new Date()
  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  }
}

export function EmployeePaymentForm({
  initialValue,
  employees,
  accounts,
  isSubmitting,
  onSubmit,
  onCancel,
}: EmployeePaymentFormProps) {
  const currentReference = getCurrentReference()

  const [employeeId, setEmployeeId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [type, setType] = useState<PaymentType | ''>('SALARY')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [referenceMonth, setReferenceMonth] = useState(currentReference.month)
  const [referenceYear, setReferenceYear] = useState(currentReference.year)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reference = getCurrentReference()
    setEmployeeId(initialValue?.employeeId ?? '')
    setAccountId(initialValue?.accountId ?? '')
    setType(initialValue?.type ?? 'SALARY')
    setAmount(initialValue ? String(initialValue.amount) : '')
    setDate(toDateInputValue(initialValue?.date) || toDateInputValue(new Date()))
    setReferenceMonth(initialValue ? String(initialValue.referenceMonth) : reference.month)
    setReferenceYear(initialValue ? String(initialValue.referenceYear) : reference.year)
    setNotes(initialValue?.notes ?? '')
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = Number(amount)
    const parsedReferenceMonth = Number(referenceMonth)
    const parsedReferenceYear = Number(referenceYear)

    if (!employeeId) {
      setError('Selecione um funcionário.')
      return
    }
    if (!type) {
      setError('Selecione o tipo de pagamento.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }
    if (!date) {
      setError('Informe a data do pagamento.')
      return
    }
    if (!Number.isInteger(parsedReferenceMonth) || parsedReferenceMonth < 1 || parsedReferenceMonth > 12) {
      setError('Mês de referência deve ser entre 1 e 12.')
      return
    }
    if (!Number.isInteger(parsedReferenceYear) || parsedReferenceYear < 2000) {
      setError('Ano de referência deve ser maior ou igual a 2000.')
      return
    }

    const trimmedNotes = notes.trim()

    if (!initialValue) {
      setError(null)
      onSubmit({
        employeeId,
        type,
        amount: parsedAmount,
        date: dateInputToIso(date)!,
        referenceMonth: parsedReferenceMonth,
        referenceYear: parsedReferenceYear,
        ...(accountId ? { accountId } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      })
      return
    }

    const payload: EmployeePaymentPayload = {}

    if (employeeId !== initialValue.employeeId) payload.employeeId = employeeId
    if (type !== initialValue.type) payload.type = type
    if (parsedAmount !== Number(initialValue.amount)) payload.amount = parsedAmount
    if (date !== toDateInputValue(initialValue.date)) payload.date = dateInputToIso(date)!
    if (parsedReferenceMonth !== initialValue.referenceMonth) payload.referenceMonth = parsedReferenceMonth
    if (parsedReferenceYear !== initialValue.referenceYear) payload.referenceYear = parsedReferenceYear
    if (accountId !== (initialValue.accountId ?? '')) payload.accountId = accountId || null
    if (trimmedNotes !== (initialValue.notes ?? '')) payload.notes = trimmedNotes || null

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
          <Label htmlFor="employee-payment-employee">Funcionário</Label>
          <Select
            id="employee-payment-employee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            required
          >
            <option value="">Selecione</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.role}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-payment-type">Tipo</Label>
          <Select
            id="employee-payment-type"
            value={type}
            onChange={(event) => setType(event.target.value as PaymentType)}
            required
          >
            {paymentTypes.map((paymentType) => (
              <option key={paymentType} value={paymentType}>
                {formatPaymentType(paymentType)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employee-payment-amount">Valor</Label>
          <Input
            id="employee-payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-payment-date">Data</Label>
          <Input
            id="employee-payment-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
            {formatCurrency(Number(amount) || 0)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employee-payment-reference-month">Mês referência</Label>
          <Input
            id="employee-payment-reference-month"
            type="number"
            min="1"
            max="12"
            step="1"
            value={referenceMonth}
            onChange={(event) => setReferenceMonth(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-payment-reference-year">Ano referência</Label>
          <Input
            id="employee-payment-reference-year"
            type="number"
            min="2000"
            step="1"
            value={referenceYear}
            onChange={(event) => setReferenceYear(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-payment-account">Conta</Label>
          <Select id="employee-payment-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Sem conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employee-payment-notes">Observações</Label>
        <Textarea id="employee-payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {accountId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pagamento com conta: ao salvar, o valor será debitado do saldo da conta selecionada.
        </div>
      )}

      {initialValue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Alterações de valor ou conta ajustam automaticamente o saldo.
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
