'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldError, FormActions, OptionalSection, RequiredMark, formControlClass, formTextareaClass } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Category, Product } from '@/types/api'
import type { ProductPayload } from '../api'

const units = [
  { value: 'KG', label: 'kg' },
  { value: 'BOX', label: 'Caixa' },
  { value: 'UNIT', label: 'Unidade' },
  { value: 'BAG', label: 'Saca' },
  { value: 'TON', label: 'Tonelada' },
  { value: 'LITER', label: 'Litro' },
  { value: 'METER', label: 'Metro' },
  { value: 'HECTARE', label: 'Hectare' },
]

interface ProductFormProps {
  initialValue?: Product | null
  categories: Category[]
  isSubmitting?: boolean
  onSubmit: (payload: ProductPayload) => void
  onCancel: () => void
}

export function ProductForm({ initialValue, categories, isSubmitting, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('KG')
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setDescription(initialValue?.description ?? '')
    setUnit(initialValue?.unit ?? 'KG')
    setCategoryId(initialValue?.categoryId ?? '')
    setActive(initialValue?.active ?? true)
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setError('Informe o nome do produto com pelo menos 2 caracteres.')
      return
    }

    const payload: ProductPayload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      unit,
      categoryId: categoryId || null,
      ...(initialValue ? { active } : {}),
    }

    if (
      initialValue &&
      payload.name === initialValue.name &&
      payload.description === (initialValue.description ?? null) &&
      payload.unit === initialValue.unit &&
      payload.categoryId === (initialValue.categoryId ?? null) &&
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
        <Label htmlFor="product-name">
          Nome
          <RequiredMark />
        </Label>
        <Input id="product-name" className={formControlClass} value={name} onChange={(event) => setName(event.target.value)} required />
        <FieldError message={error?.includes('nome do produto') ? error : null} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-unit">
            Unidade
            <RequiredMark />
          </Label>
          <Select id="product-unit" className={formControlClass} value={unit} onChange={(event) => setUnit(event.target.value)}>
            {units.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Categoria</Label>
          <Select id="product-category" className={formControlClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <OptionalSection>
        <div className="space-y-2">
          <Label htmlFor="product-description">Descrição</Label>
          <Textarea
            id="product-description"
            className={formTextareaClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </OptionalSection>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Produto ativo
        </label>
      )}

      {error && !error.includes('nome do produto') && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}
