'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { FarmLocation, FarmLocationType } from '@/types/api'
import type { FarmLocationPayload } from '../api'

const typeOptions: Array<{ value: FarmLocationType; label: string }> = [
  { value: 'GREENHOUSE', label: 'Estufa' },
  { value: 'PLOT', label: 'Talhao' },
  { value: 'FIELD', label: 'Campo/Area' },
]

interface FarmLocationFormProps {
  initialValue?: FarmLocation | null
  isSubmitting?: boolean
  onSubmit: (payload: FarmLocationPayload) => void
  onCancel: () => void
}

export function FarmLocationForm({ initialValue, isSubmitting, onSubmit, onCancel }: FarmLocationFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<FarmLocationType | ''>('')
  const [area, setArea] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setType(initialValue?.type ?? '')
    setArea(initialValue?.area === null || initialValue?.area === undefined ? '' : String(initialValue.area))
    setNotes(initialValue?.notes ?? '')
    setActive(initialValue?.active ?? true)
    setError(null)
  }, [initialValue])

  function validate() {
    const parsedArea = area === '' ? null : Number(area)

    if (name.trim().length < 2) return 'Informe o nome do local com pelo menos 2 caracteres.'
    if (!type) return 'Selecione o tipo do local.'
    if (parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) {
      return 'Area deve ser um numero maior que zero.'
    }

    return null
  }

  function buildCreatePayload(): FarmLocationPayload {
    return {
      name: name.trim(),
      type: type as FarmLocationType,
      ...(area ? { area: Number(area) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }
  }

  function buildUpdatePayload(): FarmLocationPayload {
    if (!initialValue) return buildCreatePayload()

    const payload: FarmLocationPayload = {}
    const initialArea = initialValue.area === null || initialValue.area === undefined ? '' : String(initialValue.area)
    const initialNotes = initialValue.notes ?? ''

    if (name.trim() !== initialValue.name) payload.name = name.trim()
    if (type && type !== initialValue.type) payload.type = type
    if (area !== initialArea) payload.area = area ? Number(area) : null
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
          <Label htmlFor="farm-location-name">Nome do local/area</Label>
          <Input id="farm-location-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="farm-location-type">Tipo</Label>
          <Select
            id="farm-location-type"
            value={type}
            onChange={(event) => setType(event.target.value as FarmLocationType)}
            required
          >
            <option value="">Selecione</option>
            {typeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="farm-location-area">Area</Label>
        <Input
          id="farm-location-area"
          type="number"
          min="0.01"
          step="0.01"
          value={area}
          onChange={(event) => setArea(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="farm-location-notes">Observacoes</Label>
        <Textarea id="farm-location-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Local ativo
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
