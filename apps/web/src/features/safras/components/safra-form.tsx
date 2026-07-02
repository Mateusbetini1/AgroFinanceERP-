'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FieldError,
  FormActions,
  OptionalSection,
  RequiredMark,
  formControlClass,
  formTextareaClass,
} from '@/components/ui/form'
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
    if (!startDate) return 'Informe a data de início.'
    if (endDate && endDate <= startDate) return 'Data de fim deve ser posterior à data de início.'
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

  const productError = error?.includes('produto/cultura') ? error : null
  const nameError = error?.includes('nome da safra') ? error : null
  const startDateError = error?.includes('data de início') ? error : null
  const shownNearField = productError || nameError || startDateError

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="safra-name">
          Nome
          <RequiredMark />
        </Label>
        <Input id="safra-name" className={formControlClass} value={name} onChange={(event) => setName(event.target.value)} required />
        <FieldError message={nameError} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="safra-product">
            Produto/Cultura
            <RequiredMark />
          </Label>
          <Select
            id="safra-product"
            className={formControlClass}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
          >
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <FieldError message={productError} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-status">
            Status
            <RequiredMark />
          </Label>
          <Select
            id="safra-status"
            className={formControlClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as SafraStatus)}
            required
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} - {item.description}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="safra-start">
            Início
            <RequiredMark />
          </Label>
          <Input
            id="safra-start"
            className={formControlClass}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
          <FieldError message={startDateError} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-end">Fim</Label>
          <Input
            id="safra-end"
            className={formControlClass}
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
      </div>

      <OptionalSection>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="safra-location">Talhão/Local</Label>
            <Select
              id="safra-location"
              className={formControlClass}
              value={farmLocationId}
              onChange={(event) => setFarmLocationId(event.target.value)}
            >
              <option value="">Sem talhão/local</option>
              {farmLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="safra-yield">Produção estimada {selectedProduct ? `(${formatUnit(selectedProduct.unit)})` : ''}</Label>
            <Input
              id="safra-yield"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              className={formControlClass}
              value={estimatedYield}
              onChange={(event) => setEstimatedYield(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="safra-notes">Observações</Label>
          <Textarea id="safra-notes" className={formTextareaClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </OptionalSection>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Safra ativa
        </label>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Receitas e despesas podem ser vinculadas a esta safra. O resultado por safra será tratado futuramente em relatórios.
      </div>

      {error && !shownNearField && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
