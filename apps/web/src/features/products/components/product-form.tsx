'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
        <Label htmlFor="product-name">Nome</Label>
        <Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Descrição</Label>
        <Textarea
          id="product-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-unit">Unidade</Label>
          <Select id="product-unit" value={unit} onChange={(event) => setUnit(event.target.value)}>
            {units.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Categoria</Label>
          <Select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Produto ativo
        </label>
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
