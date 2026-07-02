'use client'

import { useEffect, useMemo, useState } from 'react'
import { FormActions } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, toDateInputValue } from '@/lib/utils'
import type { Account, Product, Revenue, RevenueStatus, Safra } from '@/types/api'
import type { RevenuePayload } from '../api'

interface RevenueFormProps {
  initialValue?: Revenue | null
  products: Product[]
  accounts: Account[]
  safras: Safra[]
  isSubmitting?: boolean
  onSubmit: (payload: RevenuePayload) => void
  onCancel: () => void
}

export function RevenueForm({
  initialValue,
  products,
  accounts,
  safras,
  isSubmitting,
  onSubmit,
  onCancel,
}: RevenueFormProps) {
  const [productId, setProductId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [safraId, setSafraId] = useState('')
  const [date, setDate] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [client, setClient] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<RevenueStatus>('PENDING')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProductId(initialValue?.productId ?? '')
    setAccountId(initialValue?.accountId ?? '')
    setSafraId(initialValue?.safraId ?? '')
    setDate(toDateInputValue(initialValue?.date) || toDateInputValue(new Date()))
    setReceivedAt(toDateInputValue(initialValue?.receivedAt))
    setQuantity(initialValue ? String(initialValue.quantity) : '')
    setUnitPrice(initialValue ? String(initialValue.unitPrice) : '')
    setClient(initialValue?.client ?? '')
    setNotes(initialValue?.notes ?? '')
    setStatus(initialValue?.status ?? 'PENDING')
    setError(null)
  }, [initialValue])

  const totalAmount = useMemo(() => {
    const parsedQuantity = Number(quantity)
    const parsedUnitPrice = Number(unitPrice)
    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedUnitPrice)) return 0
    return parsedQuantity * parsedUnitPrice
  }, [quantity, unitPrice])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedQuantity = Number(quantity)
    const parsedUnitPrice = Number(unitPrice)

    if (!productId) {
      setError('Selecione um produto.')
      return
    }
    if (!date) {
      setError('Informe a data da receita.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Quantidade deve ser maior que zero.')
      return
    }
    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
      setError('Preço unitário deve ser maior que zero.')
      return
    }
    if (status === 'RECEIVED' && !accountId) {
      setError('Selecione uma conta para receitas recebidas.')
      return
    }

    const payload: RevenuePayload = {
      productId,
      accountId: accountId || null,
      safraId: safraId || null,
      date: dateInputToIso(date)!,
      receivedAt: dateInputToIso(receivedAt),
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      client: client.trim() ? client.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      status,
    }

    if (
      initialValue &&
      payload.productId === initialValue.productId &&
      payload.accountId === (initialValue.accountId ?? null) &&
      payload.safraId === (initialValue.safraId ?? null) &&
      payload.date === dateInputToIso(toDateInputValue(initialValue.date)) &&
      payload.receivedAt === dateInputToIso(toDateInputValue(initialValue.receivedAt)) &&
      payload.quantity === Number(initialValue.quantity) &&
      payload.unitPrice === Number(initialValue.unitPrice) &&
      payload.client === (initialValue.client ?? null) &&
      payload.notes === (initialValue.notes ?? null) &&
      payload.status === initialValue.status
    ) {
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
          <Label htmlFor="revenue-product">Produto</Label>
          <Select id="revenue-product" value={productId} onChange={(event) => setProductId(event.target.value)} required>
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenue-safra">Safra</Label>
          <Select id="revenue-safra" value={safraId} onChange={(event) => setSafraId(event.target.value)}>
            <option value="">Sem safra</option>
            {safras.map((safra) => (
              <option key={safra.id} value={safra.id}>
                {safra.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="revenue-date">Data</Label>
          <Input id="revenue-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenue-status">Status</Label>
          <Select
            id="revenue-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as RevenueStatus)}
          >
            <option value="PENDING">Pendente</option>
            <option value="RECEIVED">Recebida</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenue-received-at">
            {status === 'RECEIVED' ? 'Data do recebimento' : 'Data prevista de recebimento'}
          </Label>
          <Input
            id="revenue-received-at"
            type="date"
            value={receivedAt}
            onChange={(event) => setReceivedAt(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="revenue-quantity">Quantidade</Label>
          <Input
            id="revenue-quantity"
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenue-unit-price">Preço unitário</Label>
          <Input
            id="revenue-unit-price"
            type="number"
            min="0.01"
            step="0.01"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Total calculado</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="revenue-account">Conta {status === 'RECEIVED' ? '*' : ''}</Label>
        <Select
          id="revenue-account"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          required={status === 'RECEIVED'}
        >
          <option value="">Sem conta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="revenue-client">Cliente</Label>
          <Input id="revenue-client" value={client} onChange={(event) => setClient(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="revenue-notes">Observações</Label>
          <Textarea id="revenue-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>

      {status === 'RECEIVED' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Receita recebida: ao salvar, o valor será somado ao saldo da conta selecionada.
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

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
