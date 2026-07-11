'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldError, FormActions, OptionalSection, RequiredMark, formControlClass, formTextareaClass } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatSupplyCategory, formatUnit } from '@/lib/utils'
import type { Supply, SupplyCategory, SupplyUnit } from '@/types/api'
import type { SupplyPayload } from '../api'

const categories: SupplyCategory[] = [
  'DEFENSIVE',
  'FERTILIZER',
  'SEED',
  'SUBSTRATE',
  'PACKAGING',
  'FUEL',
  'OTHER',
]

const units: SupplyUnit[] = ['KG', 'G', 'L', 'ML', 'UNIT', 'BAG', 'BOX']

interface SupplyFormProps {
  initialValue?: Supply | null
  isSubmitting?: boolean
  onSubmit: (payload: SupplyPayload) => void
  onCancel: () => void
}

export function SupplyForm({ initialValue, isSubmitting, onSubmit, onCancel }: SupplyFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<SupplyCategory>('DEFENSIVE')
  const [baseUnit, setBaseUnit] = useState<SupplyUnit>('KG')
  const [purchaseUnitDefault, setPurchaseUnitDefault] = useState<SupplyUnit>('KG')
  const [packageSizeBaseQuantity, setPackageSizeBaseQuantity] = useState('')
  const [packageSizeUnit, setPackageSizeUnit] = useState<SupplyUnit | ''>('')
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const purchaseUnitNeedsPackageSize = purchaseUnitDefault === 'BAG' || purchaseUnitDefault === 'BOX'

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setCategory(initialValue?.category ?? 'DEFENSIVE')
    setBaseUnit(initialValue?.baseUnit ?? 'KG')
    setPurchaseUnitDefault(initialValue?.purchaseUnitDefault ?? 'KG')
    setPackageSizeBaseQuantity(
      initialValue?.packageSizeBaseQuantity !== null && initialValue?.packageSizeBaseQuantity !== undefined
        ? String(initialValue.packageSizeBaseQuantity)
        : '',
    )
    setPackageSizeUnit(initialValue?.packageSizeUnit ?? '')
    setActive(initialValue?.active ?? true)
    setNotes(initialValue?.notes ?? '')
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setError('Informe o nome do insumo com pelo menos 2 caracteres.')
      return
    }

    const packageQuantity = packageSizeBaseQuantity.trim()
      ? Number(packageSizeBaseQuantity.replace(',', '.'))
      : null

    if (packageQuantity !== null && (!Number.isFinite(packageQuantity) || packageQuantity <= 0)) {
      setError('O tamanho da embalagem deve ser maior que zero.')
      return
    }

    const payload: SupplyPayload = {
      name: name.trim(),
      category,
      baseUnit,
      purchaseUnitDefault,
      packageSizeBaseQuantity: packageQuantity,
      packageSizeUnit: packageSizeUnit || null,
      notes: notes.trim() ? notes.trim() : null,
      ...(initialValue ? { active } : {}),
    }

    if (
      initialValue &&
      payload.name === initialValue.name &&
      payload.category === initialValue.category &&
      payload.baseUnit === initialValue.baseUnit &&
      payload.purchaseUnitDefault === initialValue.purchaseUnitDefault &&
      String(payload.packageSizeBaseQuantity ?? '') === String(initialValue.packageSizeBaseQuantity ?? '') &&
      payload.packageSizeUnit === (initialValue.packageSizeUnit ?? null) &&
      payload.notes === (initialValue.notes ?? null) &&
      payload.active === initialValue.active
    ) {
      setError('Altere ao menos um campo antes de salvar.')
      return
    }

    setError(null)
    onSubmit(payload)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="supply-name">
          Nome
          <RequiredMark />
        </Label>
        <Input id="supply-name" className={formControlClass} value={name} onChange={(event) => setName(event.target.value)} required />
        <FieldError message={error?.includes('nome do insumo') ? error : null} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supply-category">
            Categoria
            <RequiredMark />
          </Label>
          <Select
            id="supply-category"
            className={formControlClass}
            value={category}
            onChange={(event) => setCategory(event.target.value as SupplyCategory)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {formatSupplyCategory(item)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supply-base-unit">
            Unidade base
            <RequiredMark />
          </Label>
          <p className="text-xs leading-snug text-muted-foreground">Unidade usada para controlar estoque.</p>
          <Select
            id="supply-base-unit"
            className={formControlClass}
            value={baseUnit}
            onChange={(event) => setBaseUnit(event.target.value as SupplyUnit)}
          >
            {units.map((item) => (
              <option key={item} value={item}>
                {formatUnit(item)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supply-purchase-unit">
            Unidade padrão de compra
            <RequiredMark />
          </Label>
          <p className="text-xs leading-snug text-muted-foreground">Como normalmente compra esse insumo.</p>
          <Select
            id="supply-purchase-unit"
            className={formControlClass}
            value={purchaseUnitDefault}
            onChange={(event) => setPurchaseUnitDefault(event.target.value as SupplyUnit)}
          >
            {units.map((item) => (
              <option key={item} value={item}>
                {formatUnit(item)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supply-package-size">Tamanho da embalagem</Label>
          <p className="text-xs leading-snug text-muted-foreground">
            Quantidade convertida para a unidade base.
          </p>
          <Input
            id="supply-package-size"
            className={formControlClass}
            inputMode="decimal"
            value={packageSizeBaseQuantity}
            onChange={(event) => setPackageSizeBaseQuantity(event.target.value)}
            placeholder={purchaseUnitNeedsPackageSize ? 'Ex.: 40' : 'Opcional'}
          />
          <p className="text-xs leading-snug text-muted-foreground">
            {purchaseUnitNeedsPackageSize
              ? 'Informe para converter compras por saco ou caixa em estoque.'
              : 'Opcional quando a compra já usa kg, g, L, ml ou un.'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supply-package-unit">Unidade do tamanho da embalagem</Label>
          <Select
            id="supply-package-unit"
            className={formControlClass}
            value={packageSizeUnit}
            onChange={(event) => setPackageSizeUnit(event.target.value as SupplyUnit | '')}
          >
            <option value="">Não informada</option>
            {units.map((item) => (
              <option key={item} value={item}>
                {formatUnit(item)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        Ex.: se compra em saco de 40 kg, escolha compra padrão = saco, tamanho = 40, unidade = kg.
      </p>

      <OptionalSection>
        <div className="space-y-2">
          <Label htmlFor="supply-notes">Observações</Label>
          <Textarea
            id="supply-notes"
            className={formTextareaClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </OptionalSection>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Insumo ativo
        </label>
      )}

      {error && !error.includes('nome do insumo') && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
