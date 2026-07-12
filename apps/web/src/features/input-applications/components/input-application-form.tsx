'use client'

import { useMemo, useState } from 'react'
import { FieldError, FormActions, OptionalSection, RequiredMark, formControlClass, formTextareaClass } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, formatQuantity, formatUnit, toDateInputValue } from '@/lib/utils'
import type { FarmLocation, InputStockBalance, Safra, Supply, SupplyUnit } from '@/types/api'
import type { InputApplicationPayload } from '../api'

const units: SupplyUnit[] = ['KG', 'G', 'L', 'ML', 'UNIT']

interface InputApplicationFormProps {
  supplies: Supply[]
  balances: InputStockBalance[]
  safras: Safra[]
  farmLocations: FarmLocation[]
  isSubmitting?: boolean
  onSubmit: (payload: InputApplicationPayload) => void
  onCancel: () => void
}

function parseDecimal(value: string): number {
  return Number(value.replace(',', '.'))
}

function convertToBase(quantity: number, unit: SupplyUnit, baseUnit: SupplyUnit): number | null {
  if (unit === baseUnit) return quantity
  if (baseUnit === 'KG' && unit === 'G') return quantity / 1000
  if (baseUnit === 'G' && unit === 'KG') return quantity * 1000
  if (baseUnit === 'L' && unit === 'ML') return quantity / 1000
  if (baseUnit === 'ML' && unit === 'L') return quantity * 1000
  return null
}

export function InputApplicationForm({
  supplies,
  balances,
  safras,
  farmLocations,
  isSubmitting,
  onSubmit,
  onCancel,
}: InputApplicationFormProps) {
  const [applicationDate, setApplicationDate] = useState(toDateInputValue(new Date()))
  const [supplyId, setSupplyId] = useState(supplies[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<SupplyUnit>(supplies[0]?.baseUnit ?? 'KG')
  const [safraId, setSafraId] = useState(safras[0]?.id ?? '')
  const [farmLocationId, setFarmLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedSupply = supplies.find((supply) => supply.id === supplyId)
  const selectedBalance = balances.find((balance) => balance.supplyId === supplyId)

  const estimated = useMemo(() => {
    if (!selectedSupply) return null
    const parsedQuantity = parseDecimal(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return null
    const quantityBase = convertToBase(parsedQuantity, unit, selectedSupply.baseUnit)
    if (quantityBase === null) return null
    return {
      quantityBase,
      totalCost: quantityBase * Number(selectedBalance?.averageCostBase ?? 0),
    }
  }, [quantity, selectedBalance?.averageCostBase, selectedSupply, unit])

  function handleSupplyChange(nextSupplyId: string) {
    setSupplyId(nextSupplyId)
    const nextSupply = supplies.find((supply) => supply.id === nextSupplyId)
    if (nextSupply && !['BAG', 'BOX'].includes(nextSupply.baseUnit)) setUnit(nextSupply.baseUnit)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedQuantity = parseDecimal(quantity)
    if (!applicationDate) return setError('Informe a data da aplicacao.')
    if (!supplyId) return setError('Selecione o insumo.')
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return setError('Quantidade deve ser maior que zero.')
    }
    if (!safraId) return setError('Selecione a safra.')
    if (!selectedSupply) return setError('Insumo invalido.')
    if (convertToBase(parsedQuantity, unit, selectedSupply.baseUnit) === null) {
      return setError('Unidade incompativel com a unidade base do insumo.')
    }

    setError(null)
    onSubmit({
      supplyId,
      applicationDate: dateInputToIso(applicationDate) ?? applicationDate,
      quantity: parsedQuantity,
      unit,
      safraId,
      farmLocationId: farmLocationId || null,
      notes: notes.trim() ? notes.trim() : null,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="input-application-date">
            Data da aplicacao
            <RequiredMark />
          </Label>
          <Input
            id="input-application-date"
            type="date"
            className={formControlClass}
            value={applicationDate}
            onChange={(event) => setApplicationDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-application-supply">
            Insumo
            <RequiredMark />
          </Label>
          <Select
            id="input-application-supply"
            className={formControlClass}
            value={supplyId}
            onChange={(event) => handleSupplyChange(event.target.value)}
          >
            <option value="">Selecione</option>
            {supplies.map((supply) => (
              <option key={supply.id} value={supply.id}>
                {supply.name}
              </option>
            ))}
          </Select>
          {selectedSupply && (
            <p className="text-xs text-muted-foreground">
              Saldo: {formatQuantity(selectedBalance?.quantityBase ?? 0)} {formatUnit(selectedSupply.baseUnit)}
            </p>
          )}
          {selectedSupply && Number(selectedBalance?.quantityBase ?? 0) <= 0 && (
            <p className="text-xs text-destructive">Nao ha saldo disponivel para este insumo.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-application-quantity">
            Quantidade
            <RequiredMark />
          </Label>
          <Input
            id="input-application-quantity"
            className={formControlClass}
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-application-unit">
            Unidade
            <RequiredMark />
          </Label>
          <Select
            id="input-application-unit"
            className={formControlClass}
            value={unit}
            onChange={(event) => setUnit(event.target.value as SupplyUnit)}
          >
            {units.map((item) => (
              <option key={item} value={item}>
                {formatUnit(item)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-application-safra">
            Safra
            <RequiredMark />
          </Label>
          <Select
            id="input-application-safra"
            className={formControlClass}
            value={safraId}
            onChange={(event) => setSafraId(event.target.value)}
          >
            <option value="">Selecione</option>
            {safras.map((safra) => (
              <option key={safra.id} value={safra.id}>
                {safra.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-application-location">Talhao/Local</Label>
          <Select
            id="input-application-location"
            className={formControlClass}
            value={farmLocationId}
            onChange={(event) => setFarmLocationId(event.target.value)}
          >
            <option value="">Sem local</option>
            {farmLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <OptionalSection>
        <div className="space-y-2">
          <Label htmlFor="input-application-notes">Observacoes</Label>
          <Textarea
            id="input-application-notes"
            className={formTextareaClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </OptionalSection>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Custo estimado</p>
        <p className="mt-1 text-lg font-semibold">{estimated ? formatCurrency(estimated.totalCost) : '-'}</p>
        {estimated && selectedSupply && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatQuantity(estimated.quantityBase)} {formatUnit(selectedSupply.baseUnit)} x{' '}
            {formatCurrency(selectedBalance?.averageCostBase ?? 0)}
          </p>
        )}
      </div>

      <FieldError message={error} />
      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
