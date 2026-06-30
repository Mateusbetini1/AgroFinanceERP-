'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatUnit, toDateInputValue } from '@/lib/utils'
import type { FarmLocation, Product, Safra, SafraStatus } from '@/types/api'
import type { SafraPayload } from '../api'

const statusOptions: Array<{ value: SafraStatus; label: string; description: string }> = [
  { value: 'PLANNED', label: 'Planejada', description: 'ainda não começou' },
  { value: 'ACTIVE', label: 'Ativa', description: 'está em andamento' },
  { value: 'COMPLETED', label: 'Concluída', description: 'terminou' },
  { value: 'CANCELLED', label: 'Cancelada', description: 'não foi para frente' },
]

interface SafraFormProps {
  initialValue?: Safra | null
  products: Product[]
  farmLocations: FarmLocation[]
  isSubmitting?: boolean
  onSubmit: (payload: SafraPayload) => void
  onCancel: () => void
}

function sameDate(left: string | null | undefined, right: string | null | undefined) {
  return toDateInputValue(left) === toDateInputValue(right)
}

export function SafraForm({
  initialValue,
  products,
  farmLocations,
  isSubmitting,
  onSubmit,
  onCancel,
}: SafraFormProps) {
  const [productId, setProductId] = useState('')
  const [farmLocationId, setFarmLocationId] = useState('')
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [estimatedYield, setEstimatedYield] = useState('')
  const [status, setStatus] = useState<SafraStatus>('PLANNED')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProductId(initialValue?.productId ?? initialValue?.product?.id ?? '')
    setFarmLocationId(initialValue?.farmLocationId ?? initialValue?.farmLocation?.id ?? '')
    setName(initialValue?.name ?? '')
    setStartDate(toDateInputValue(initialValue?.startDate) || toDateInputValue(new Date()))
    setEndDate(toDateInputValue(initialValue?.endDate))
    setEstimatedYield(
      initialValue?.estimatedYield === null || initialValue?.estimatedYield === undefined
        ? ''
        : String(initialValue.estimatedYield),
    )
    setStatus(initialValue?.status ?? 'PLANNED')
    setNotes(initialValue?.notes ?? '')
    setActive(initialValue?.active ?? true)
    setError(null)
  }, [initialValue])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [productId, products],
  )

  function validate() {
    const parsedYield = estimatedYield === '' ? null : Number(estimatedYield)

    if (!productId) return 'Selecione um produto/cultura.'
    if (!name.trim()) return 'Informe o nome da safra.'
    if (!startDate) return 'Informe a data de inicio.'
    if (endDate && endDate <= startDate) return 'Data de fim deve ser posterior a data de inicio.'
    if (parsedYield !== null && (!Number.isFinite(parsedYield) || parsedYield < 0)) {
      return 'Produção estimada deve ser um número maior ou igual a zero.'
    }
    if (!status) return 'Selecione o status da safra.'

    return null
  }

  function buildCreatePayload(): SafraPayload {
    const parsedYield = estimatedYield === '' ? undefined : Number(estimatedYield)

    return {
      productId,
      name: name.trim(),
      startDate: dateInputToIso(startDate)!,
      ...(farmLocationId ? { farmLocationId } : {}),
      ...(endDate ? { endDate: dateInputToIso(endDate)! } : {}),
      ...(parsedYield !== undefined ? { estimatedYield: parsedYield } : {}),
      status,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }
  }

  function buildUpdatePayload(): SafraPayload {
    if (!initialValue) return buildCreatePayload()

    const payload: SafraPayload = {}
    const initialProductId = initialValue.productId ?? initialValue.product?.id ?? ''
    const initialFarmLocationId = initialValue.farmLocationId ?? initialValue.farmLocation?.id ?? ''
    const initialYield =
      initialValue.estimatedYield === null || initialValue.estimatedYield === undefined
        ? ''
        : String(initialValue.estimatedYield)
    const initialNotes = initialValue.notes ?? ''

    if (productId !== initialProductId) payload.productId = productId
    if (farmLocationId !== initialFarmLocationId) payload.farmLocationId = farmLocationId || null
    if (name.trim() !== initialValue.name) payload.name = name.trim()
    if (!sameDate(startDate, initialValue.startDate)) payload.startDate = dateInputToIso(startDate)!
    if (!sameDate(endDate, initialValue.endDate)) payload.endDate = endDate ? dateInputToIso(endDate)! : null
    if (estimatedYield !== initialYield) payload.estimatedYield = estimatedYield === '' ? null : Number(estimatedYield)
    if (status !== initialValue.status) payload.status = status
    if (notes.trim() !== initialNotes) payload.notes = notes.trim() ? notes.trim() : null
    if (active !== initialValue.active) payload.active = active

    return payload
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = initialValue ? buildUpdatePayload() : buildCreatePayload()
    if (initialValue && Object.keys(payload).length === 0) {
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
          <Label htmlFor="safra-product">Produto/Cultura</Label>
          <Select id="safra-product" value={productId} onChange={(event) => setProductId(event.target.value)} required>
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-location">Local/Area</Label>
          <Select id="safra-location" value={farmLocationId} onChange={(event) => setFarmLocationId(event.target.value)}>
            <option value="">Sem local</option>
            {farmLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-name">Nome</Label>
        <Input id="safra-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="safra-start">Inicio</Label>
          <Input id="safra-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-end">Fim</Label>
          <Input id="safra-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-yield">Produção estimada {selectedProduct ? `(${formatUnit(selectedProduct.unit)})` : ''}</Label>
          <Input
            id="safra-yield"
            type="number"
            min="0"
            step="0.001"
            value={estimatedYield}
            onChange={(event) => setEstimatedYield(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-status">Status</Label>
        <Select id="safra-status" value={status} onChange={(event) => setStatus(event.target.value as SafraStatus)} required>
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label} - {item.description}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-notes">Observacoes</Label>
        <Textarea id="safra-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Safra ativa
        </label>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Receitas e despesas podem ser vinculadas a esta safra. O resultado por safra será tratado futuramente em relatórios.
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
