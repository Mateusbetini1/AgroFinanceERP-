'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, FormActions, OptionalSection, RequiredMark, formControlClass, formTextareaClass } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, formatUnit, toDateInputValue } from '@/lib/utils'
import type { Supplier, Supply, SupplyUnit } from '@/types/api'
import type { InputPurchasePayload } from '../api'

const units: SupplyUnit[] = ['KG', 'G', 'L', 'ML', 'UNIT', 'BAG', 'BOX']

interface DraftItem {
  supplyId: string
  quantity: string
  unit: SupplyUnit
  totalAmount: string
}

interface InputPurchaseFormProps {
  supplies: Supply[]
  suppliers: Supplier[]
  isSubmitting?: boolean
  onSubmit: (payload: InputPurchasePayload) => void
  onCancel: () => void
}

function newItem(defaultSupply?: Supply): DraftItem {
  return {
    supplyId: defaultSupply?.id ?? '',
    quantity: '',
    unit: defaultSupply?.purchaseUnitDefault ?? 'KG',
    totalAmount: '',
  }
}

export function InputPurchaseForm({
  supplies,
  suppliers,
  isSubmitting,
  onSubmit,
  onCancel,
}: InputPurchaseFormProps) {
  const [purchaseDate, setPurchaseDate] = useState(toDateInputValue(new Date()))
  const [supplierId, setSupplierId] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([newItem(supplies[0])])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems((current) => {
      if (current.length > 1 || current[0]?.supplyId || !supplies[0]) return current
      return [newItem(supplies[0])]
    })
  }, [supplies])

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const value = Number(item.totalAmount.replace(',', '.'))
        return Number.isFinite(value) ? sum + value : sum
      }, 0),
    [items],
  )

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const next = { ...item, ...patch }
        if (patch.supplyId) {
          const selectedSupply = supplies.find((supply) => supply.id === patch.supplyId)
          if (selectedSupply) next.unit = selectedSupply.purchaseUnitDefault
        }
        return next
      }),
    )
  }

  function addItem() {
    setItems((current) => [...current, newItem(supplies[0])])
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!purchaseDate) {
      setError('Informe a data da compra.')
      return
    }

    if (items.length === 0) {
      setError('Informe ao menos um item da compra.')
      return
    }

    const parsedItems = items.map((item) => ({
      supplyId: item.supplyId,
      quantity: Number(item.quantity.replace(',', '.')),
      unit: item.unit,
      totalAmount: Number(item.totalAmount.replace(',', '.')),
    }))

    if (parsedItems.some((item) => !item.supplyId)) {
      setError('Selecione o insumo de todos os itens.')
      return
    }

    if (parsedItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setError('As quantidades devem ser maiores que zero.')
      return
    }

    if (parsedItems.some((item) => !Number.isFinite(item.totalAmount) || item.totalAmount <= 0)) {
      setError('Os valores dos itens devem ser maiores que zero.')
      return
    }

    setError(null)
    onSubmit({
      supplierId: supplierId || null,
      purchaseDate: dateInputToIso(purchaseDate) ?? purchaseDate,
      documentNumber: documentNumber.trim() ? documentNumber.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      items: parsedItems,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="input-purchase-date">
            Data da compra
            <RequiredMark />
          </Label>
          <Input
            id="input-purchase-date"
            type="date"
            className={formControlClass}
            value={purchaseDate}
            onChange={(event) => setPurchaseDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-purchase-supplier">Fornecedor</Label>
          <Select
            id="input-purchase-supplier"
            className={formControlClass}
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Sem fornecedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-purchase-document">Número do documento</Label>
          <Input
            id="input-purchase-document"
            className={formControlClass}
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            placeholder="NF-123"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>
            Itens
            <RequiredMark />
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={supplies.length === 0}>
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor={`input-purchase-supply-${index}`}>Insumo</Label>
                <Select
                  id={`input-purchase-supply-${index}`}
                  className={formControlClass}
                  value={item.supplyId}
                  onChange={(event) => updateItem(index, { supplyId: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {supplies.map((supply) => (
                    <option key={supply.id} value={supply.id}>
                      {supply.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`input-purchase-quantity-${index}`}>Quantidade</Label>
                <Input
                  id={`input-purchase-quantity-${index}`}
                  className={formControlClass}
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`input-purchase-unit-${index}`}>Unidade</Label>
                <Select
                  id={`input-purchase-unit-${index}`}
                  className={formControlClass}
                  value={item.unit}
                  onChange={(event) => updateItem(index, { unit: event.target.value as SupplyUnit })}
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {formatUnit(unit)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`input-purchase-total-${index}`}>Valor total</Label>
                <Input
                  id={`input-purchase-total-${index}`}
                  className={formControlClass}
                  inputMode="decimal"
                  value={item.totalAmount}
                  onChange={(event) => updateItem(index, { totalAmount: event.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover item"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <OptionalSection>
        <div className="space-y-2">
          <Label htmlFor="input-purchase-notes">Observações</Label>
          <Textarea
            id="input-purchase-notes"
            className={formTextareaClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </OptionalSection>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Total da compra</p>
        <p className="mt-1 text-lg font-semibold">{formatCurrency(total)}</p>
      </div>

      <FieldError message={error} />
      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
