'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { listAccounts } from '@/features/accounts/api'
import { listCategories } from '@/features/categories/api'
import { listActiveEmployees } from '@/features/employees/api'
import { listProducts } from '@/features/products/api'
import { listSafras } from '@/features/safras/api'
import { listSuppliers } from '@/features/suppliers/api'
import { dateInputToIso, formatCurrency, formatDate, formatPaymentType, getApiErrorMessage, toDateInputValue } from '@/lib/utils'
import { confirmAssistantDraft } from '../api'
import type { AssistantDraft } from '../types'
import type { Account, Category, PaymentType } from '@/types/api'

type DraftPayload = Record<string, unknown>

const draftLabels: Record<AssistantDraft['draftType'], string> = {
  CREATE_EXPENSE: 'Despesa',
  CREATE_BILL: 'Boleto',
  CREATE_BILL_INSTALLMENT_GROUP: 'Parcelamento de boleto',
  CREATE_EMPLOYEE_PAYMENT: 'Pagamento de funcionário',
  CREATE_REVENUE: 'Receita',
}

const fieldLabels: Record<string, string> = {
  description: 'Descrição',
  amount: 'Valor',
  totalAmount: 'Valor total',
  installmentCount: 'Quantidade de parcelas',
  firstDueDate: 'Primeiro vencimento',
  interval: 'Intervalo',
  date: 'Data',
  paymentDate: 'Data',
  dueDate: 'Vencimento',
  status: 'Status',
  type: 'Tipo',
  referenceMonth: 'Mês de referência',
  referenceYear: 'Ano de referência',
  notes: 'Observações',
  employeeId: 'Funcionário',
  accountId: 'Conta',
  categoryId: 'Categoria',
  supplierId: 'Fornecedor',
  safraId: 'Safra',
  productId: 'Produto',
  client: 'Cliente',
}

const paymentTypes: PaymentType[] = ['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE']

function optionLabel(account: Account) {
  return `${account.name} (${formatCurrency(account.currentBalance)})`
}

function isExpenseCategory(category: Category) {
  return category.active && (category.type === 'EXPENSE' || category.type === 'BOTH')
}

function distributeInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
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

function payloadValue(payload: DraftPayload, key: string) {
  const value = payload[key]
  if (value === undefined || value === null) return ''
  return String(value)
}

function payloadNumber(payload: DraftPayload, key: string) {
  const value = payload[key]
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

function recalculateMissingFields(draft: AssistantDraft) {
  const payload = draft.payload
  const missing: string[] = []
  const amount = Number(payload.amount)

  if (draft.draftType === 'CREATE_EXPENSE') {
    if (!payload.description) missing.push('description')
    if (!Number.isFinite(amount) || amount <= 0) missing.push('amount')
    if (!payload.date) missing.push('date')
    if (!payload.status) missing.push('status')
    if (!payload.categoryId) missing.push('categoryId')
    if (payload.status === 'PAID' && !payload.accountId) missing.push('accountId')
    return missing
  }

  if (draft.draftType === 'CREATE_BILL') {
    if (!payload.description) missing.push('description')
    if (!Number.isFinite(amount) || amount <= 0) missing.push('amount')
    if (!payload.dueDate) missing.push('dueDate')
    if (payload.status === 'PAID' && !payload.accountId) missing.push('accountId')
    return missing
  }

  if (draft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP') {
    if (!payload.description) missing.push('description')
    if (Number(payload.totalAmount) <= 0) missing.push('totalAmount')
    if (!Number.isInteger(Number(payload.installmentCount)) || Number(payload.installmentCount) < 2) {
      missing.push('installmentCount')
    }
    if (!payload.firstDueDate) missing.push('firstDueDate')
    return missing
  }

  if (draft.draftType === 'CREATE_REVENUE') {
    if (!Number.isFinite(amount) || amount <= 0) missing.push('amount')
    if (!payload.date) missing.push('date')
    if (!payload.status) missing.push('status')
    if (!payload.productId) missing.push('productId')
    if (payload.status === 'RECEIVED' && !payload.accountId) missing.push('accountId')
    return missing
  }

  if (!payload.employeeId) missing.push('employeeId')
  if (!payload.accountId) missing.push('accountId')
  if (!payload.type) missing.push('type')
  if (!Number.isFinite(amount) || amount <= 0) missing.push('amount')
  if (!payload.date) missing.push('date')
  if (!Number.isInteger(Number(payload.referenceMonth)) || Number(payload.referenceMonth) < 1 || Number(payload.referenceMonth) > 12) {
    missing.push('referenceMonth')
  }
  if (!Number.isInteger(Number(payload.referenceYear)) || Number(payload.referenceYear) < 2000) missing.push('referenceYear')
  return missing
}

function normalizePayloadValue(key: string, value: string) {
  if (value === '') return undefined
  if (key === 'amount' || key === 'totalAmount' || key === 'installmentCount' || key === 'referenceMonth' || key === 'referenceYear') {
    return Number(value)
  }
  if (key === 'date' || key === 'dueDate' || key === 'receivedAt' || key === 'firstDueDate') return dateInputToIso(value)
  return value
}

function normalizeDraft(draft: AssistantDraft): AssistantDraft {
  return {
    ...draft,
    missingFields: recalculateMissingFields(draft),
  }
}

export function AssistantDraftCard({
  draft,
  onChange,
  onCancel,
  onConfirmed,
}: {
  draft: AssistantDraft
  onChange: (draft: AssistantDraft) => void
  onCancel: () => void
  onConfirmed: () => void
}) {
  const [editableDraft, setEditableDraft] = useState(() => normalizeDraft(draft))

  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })
  const employeesQuery = useQuery({ queryKey: ['employees', 'active'], queryFn: listActiveEmployees })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const accounts = accountsQuery.data?.data ?? []
  const categories = useMemo(() => (categoriesQuery.data?.data ?? []).filter(isExpenseCategory), [categoriesQuery.data?.data])
  const suppliers = suppliersQuery.data?.data ?? []
  const safras = useMemo(() => (safrasQuery.data?.data ?? []).filter((safra) => safra.active), [safrasQuery.data?.data])
  const employees = employeesQuery.data?.data ?? []
  const products = useMemo(() => (productsQuery.data?.data ?? []).filter((product) => product.active), [productsQuery.data?.data])

  const installmentPreview = useMemo(() => {
    if (editableDraft.draftType !== 'CREATE_BILL_INSTALLMENT_GROUP') return []
    const total = Number(editableDraft.payload.totalAmount)
    const count = Number(editableDraft.payload.installmentCount)
    const firstDueDate = parseDateInput(toDateInputValue(editableDraft.payload.firstDueDate as string | Date | null | undefined))

    if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(count) || count < 2 || !firstDueDate) return []

    return distributeInstallmentAmounts(total, count).map((amount, index) => ({
      number: index + 1,
      amount,
      dueDate: addMonthsClamped(firstDueDate, index),
    }))
  }, [editableDraft])

  const mutation = useMutation({
    mutationFn: () => confirmAssistantDraft(editableDraft),
    onSuccess: onConfirmed,
  })

  useEffect(() => {
    setEditableDraft(normalizeDraft(draft))
  }, [draft])

  function patchPayload(key: string, value: string) {
    const payload = {
      ...editableDraft.payload,
      [key]: normalizePayloadValue(key, value),
    }

    if (key === 'amount' && editableDraft.draftType === 'CREATE_REVENUE') {
      payload.unitPrice = normalizePayloadValue(key, value)
      payload.quantity = payload.quantity ?? 1
    }
    if (key === 'dueDate' && editableDraft.draftType === 'CREATE_REVENUE') {
      payload.receivedAt = normalizePayloadValue(key, value)
    }

    if (key === 'status' && value === 'PAID' && !payload.paidAt) {
      payload.paidAt = dateInputToIso(toDateInputValue(new Date()))
    }
    if (key === 'status' && value === 'RECEIVED' && !payload.receivedAt) {
      payload.receivedAt = dateInputToIso(toDateInputValue(new Date()))
    }

    const nextDraft = normalizeDraft({ ...editableDraft, payload } as AssistantDraft)
    setEditableDraft(nextDraft)
    onChange(nextDraft)
  }

  const canConfirm = editableDraft.missingFields.length === 0 && !mutation.isPending

  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      <div className="mb-3">
        <p className="text-sm font-semibold">Rascunho: {draftLabels[editableDraft.draftType]}</p>
        <p className="text-xs text-muted-foreground">Revise e preencha os campos obrigatórios. Nada foi salvo ainda.</p>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        {editableDraft.draftType !== 'CREATE_EMPLOYEE_PAYMENT' && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="assistant-draft-description">{fieldLabels.description}</Label>
            <Input
              id="assistant-draft-description"
              value={payloadValue(editableDraft.payload, 'description')}
              onChange={(event) => patchPayload('description', event.target.value)}
            />
          </div>
        )}

        {(editableDraft.draftType === 'CREATE_EXPENSE' ||
          editableDraft.draftType === 'CREATE_BILL' ||
          editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP') && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-category">{fieldLabels.categoryId}</Label>
            <Select
              id="assistant-draft-category"
              value={payloadValue(editableDraft.payload, 'categoryId')}
              onChange={(event) => patchPayload('categoryId', event.target.value)}
            >
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_REVENUE' && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="assistant-draft-product">{fieldLabels.productId}</Label>
            <Select
              id="assistant-draft-product"
              value={payloadValue(editableDraft.payload, 'productId')}
              onChange={(event) => patchPayload('productId', event.target.value)}
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="assistant-draft-employee">{fieldLabels.employeeId}</Label>
            <Select
              id="assistant-draft-employee"
              value={payloadValue(editableDraft.payload, 'employeeId')}
              onChange={(event) => patchPayload('employeeId', event.target.value)}
            >
              <option value="">Selecione</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.role}
                </option>
              ))}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP' ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="assistant-draft-total-amount">{fieldLabels.totalAmount}</Label>
              <Input
                id="assistant-draft-total-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={payloadNumber(editableDraft.payload, 'totalAmount')}
                onChange={(event) => patchPayload('totalAmount', event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="assistant-draft-installment-count">{fieldLabels.installmentCount}</Label>
              <Input
                id="assistant-draft-installment-count"
                type="number"
                min="2"
                step="1"
                value={payloadNumber(editableDraft.payload, 'installmentCount')}
                onChange={(event) => patchPayload('installmentCount', event.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-amount">{fieldLabels.amount}</Label>
            <Input
              id="assistant-draft-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={payloadNumber(editableDraft.payload, 'amount')}
              onChange={(event) => patchPayload('amount', event.target.value)}
            />
          </div>
        )}

        {(editableDraft.draftType === 'CREATE_EXPENSE' || editableDraft.draftType === 'CREATE_REVENUE') && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-date">{fieldLabels.date}</Label>
            <Input
              id="assistant-draft-date"
              type="date"
              value={toDateInputValue(editableDraft.payload.date as string | Date | null | undefined)}
              onChange={(event) => patchPayload('date', event.target.value)}
            />
          </div>
        )}

        {editableDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-payment-date">{fieldLabels.paymentDate}</Label>
            <Input
              id="assistant-draft-payment-date"
              type="date"
              value={toDateInputValue(editableDraft.payload.date as string | Date | null | undefined)}
              onChange={(event) => patchPayload('date', event.target.value)}
            />
          </div>
        )}

        {editableDraft.draftType !== 'CREATE_EMPLOYEE_PAYMENT' && editableDraft.draftType !== 'CREATE_BILL_INSTALLMENT_GROUP' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-due-date">{fieldLabels.dueDate}</Label>
            <Input
              id="assistant-draft-due-date"
              type="date"
              value={toDateInputValue(editableDraft.payload.dueDate as string | Date | null | undefined)}
              onChange={(event) => patchPayload('dueDate', event.target.value)}
            />
          </div>
        )}

        {editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-first-due-date">{fieldLabels.firstDueDate}</Label>
            <Input
              id="assistant-draft-first-due-date"
              type="date"
              value={toDateInputValue(editableDraft.payload.firstDueDate as string | Date | null | undefined)}
              onChange={(event) => patchPayload('firstDueDate', event.target.value)}
            />
          </div>
        )}

        {(editableDraft.draftType === 'CREATE_EXPENSE' || editableDraft.draftType === 'CREATE_REVENUE') && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-status">{fieldLabels.status}</Label>
            <Select
              id="assistant-draft-status"
              value={payloadValue(editableDraft.payload, 'status')}
              onChange={(event) => patchPayload('status', event.target.value)}
            >
              {editableDraft.draftType === 'CREATE_REVENUE' ? (
                <>
                  <option value="PENDING">Pendente</option>
                  <option value="RECEIVED">Recebida</option>
                </>
              ) : (
                <>
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                </>
              )}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-type">{fieldLabels.type}</Label>
            <Select
              id="assistant-draft-type"
              value={payloadValue(editableDraft.payload, 'type')}
              onChange={(event) => patchPayload('type', event.target.value)}
            >
              {paymentTypes.map((paymentType) => (
                <option key={paymentType} value={paymentType}>
                  {paymentType === 'ADVANCE' ? 'Vale/Adiantamento' : formatPaymentType(paymentType)}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="assistant-draft-account">{fieldLabels.accountId}</Label>
          <Select
            id="assistant-draft-account"
            value={payloadValue(editableDraft.payload, 'accountId')}
            onChange={(event) => patchPayload('accountId', event.target.value)}
          >
            <option value="">Sem conta</option>
            {accounts
              .filter((account) => account.active)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {optionLabel(account)}
                </option>
              ))}
          </Select>
        </div>

        {(editableDraft.draftType === 'CREATE_EXPENSE' ||
          editableDraft.draftType === 'CREATE_BILL' ||
          editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP') && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-supplier">{fieldLabels.supplierId}</Label>
            <Select
              id="assistant-draft-supplier"
              value={payloadValue(editableDraft.payload, 'supplierId')}
              onChange={(event) => patchPayload('supplierId', event.target.value)}
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_REVENUE' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-client">{fieldLabels.client}</Label>
            <Input
              id="assistant-draft-client"
              value={payloadValue(editableDraft.payload, 'client')}
              onChange={(event) => patchPayload('client', event.target.value)}
            />
          </div>
        )}

        {editableDraft.draftType !== 'CREATE_EMPLOYEE_PAYMENT' && (
          <div className="space-y-1">
            <Label htmlFor="assistant-draft-safra">{fieldLabels.safraId}</Label>
            <Select
              id="assistant-draft-safra"
              value={payloadValue(editableDraft.payload, 'safraId')}
              onChange={(event) => patchPayload('safraId', event.target.value)}
            >
              <option value="">Sem safra</option>
              {safras.map((safra) => (
                <option key={safra.id} value={safra.id}>
                  {safra.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {editableDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && (
          <>
            <div className="space-y-1">
              <Label htmlFor="assistant-draft-reference-month">{fieldLabels.referenceMonth}</Label>
              <Input
                id="assistant-draft-reference-month"
                type="number"
                min="1"
                max="12"
                step="1"
                value={payloadNumber(editableDraft.payload, 'referenceMonth')}
                onChange={(event) => patchPayload('referenceMonth', event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="assistant-draft-reference-year">{fieldLabels.referenceYear}</Label>
              <Input
                id="assistant-draft-reference-year"
                type="number"
                min="2000"
                step="1"
                value={payloadNumber(editableDraft.payload, 'referenceYear')}
                onChange={(event) => patchPayload('referenceYear', event.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="assistant-draft-notes">{fieldLabels.notes}</Label>
              <Textarea
                id="assistant-draft-notes"
                value={payloadValue(editableDraft.payload, 'notes')}
                onChange={(event) => patchPayload('notes', event.target.value)}
              />
            </div>
          </>
        )}

        {(editableDraft.draftType === 'CREATE_REVENUE' || editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP') && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="assistant-draft-notes-extra">{fieldLabels.notes}</Label>
            <Textarea
              id="assistant-draft-notes-extra"
              value={payloadValue(editableDraft.payload, 'notes')}
              onChange={(event) => patchPayload('notes', event.target.value)}
            />
          </div>
        )}
      </div>

      {editableDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && (
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span>
            {fieldLabels.referenceMonth}:{' '}
            {editableDraft.payload.referenceMonth ? String(editableDraft.payload.referenceMonth).padStart(2, '0') : 'Não informado'}
          </span>
          <span>{fieldLabels.referenceYear}: {editableDraft.payload.referenceYear ? String(editableDraft.payload.referenceYear) : 'Não informado'}</span>
        </div>
      )}

      {editableDraft.draftType === 'CREATE_BILL_INSTALLMENT_GROUP' && installmentPreview.length > 0 && (
        <div className="mt-3 rounded-md border">
          <div className="border-b px-3 py-2 text-xs font-medium">Prévia das parcelas</div>
          <div className="divide-y">
            {installmentPreview.map((installment) => (
              <div key={installment.number} className="grid grid-cols-3 gap-2 px-3 py-2 text-xs">
                <span>Parcela {installment.number}</span>
                <span>{formatDate(installment.dueDate)}</span>
                <span className="text-right font-medium">{formatCurrency(installment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editableDraft.missingFields.length > 0 && (
        <div className="mt-3">
          <InlineAlert tone="error">
            Preencha os campos obrigatórios antes de confirmar. Faltam:{' '}
            {editableDraft.missingFields.map((field) => fieldLabels[field] ?? field).join(', ')}.
          </InlineAlert>
        </div>
      )}

      {mutation.isError && (
        <div className="mt-3">
          <InlineAlert tone="error">{getApiErrorMessage(mutation.error, 'Não foi possível confirmar o rascunho.')}</InlineAlert>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="button" className="flex-1" disabled={!canConfirm} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Confirmar
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={mutation.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
