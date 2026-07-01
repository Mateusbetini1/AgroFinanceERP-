'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { Category, CategoryType } from '@/types/api'
import type { CategoryPayload } from '../api'

const categoryTypes: Array<{ value: CategoryType; label: string }> = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'REVENUE', label: 'Receita' },
  { value: 'BOTH', label: 'Ambos' },
]

interface CategoryFormProps {
  initialValue?: Category | null
  isSubmitting?: boolean
  onSubmit: (payload: CategoryPayload) => void
  onCancel: () => void
}

export function CategoryForm({ initialValue, isSubmitting, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('BOTH')
  const [color, setColor] = useState('#16A34A')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setType(initialValue?.type ?? 'BOTH')
    setColor(initialValue?.color ?? '#16A34A')
    setActive(initialValue?.active ?? true)
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setError('Informe o nome da categoria com pelo menos 2 caracteres.')
      return
    }

    const payload: CategoryPayload = {
      name: name.trim(),
      type,
      color: color || null,
      ...(initialValue ? { active } : {}),
    }

    if (
      initialValue &&
      payload.name === initialValue.name &&
      payload.type === initialValue.type &&
      payload.color === (initialValue.color ?? null) &&
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
        <Label htmlFor="category-name">Nome</Label>
        <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category-type">Tipo</Label>
          <Select id="category-type" value={type} onChange={(event) => setType(event.target.value as CategoryType)}>
            {categoryTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category-color">Cor</Label>
          <Input id="category-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </div>
      </div>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Categoria ativa
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
