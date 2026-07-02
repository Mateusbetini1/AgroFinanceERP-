'use client'

import { useEffect, useState } from 'react'
import { FormActions } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dateInputToIso, formatCurrency, formatEmployeeType, onlyDigits, toDateInputValue } from '@/lib/utils'
import type { Employee, EmployeeStatus, EmployeeType } from '@/types/api'
import type { EmployeePayload } from '../api'

interface EmployeeFormProps {
  initialValue?: Employee | null
  isSubmitting?: boolean
  onSubmit: (payload: EmployeePayload) => void
  onCancel: () => void
}

export function EmployeeForm({ initialValue, isSubmitting, onSubmit, onCancel }: EmployeeFormProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [baseSalary, setBaseSalary] = useState('')
  const [type, setType] = useState<EmployeeType>('MONTHLY')
  const [status, setStatus] = useState<EmployeeStatus>('ACTIVE')
  const [hireDate, setHireDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setRole(initialValue?.role ?? '')
    setDocument(initialValue?.document ?? '')
    setPhone(initialValue?.phone ?? '')
    setPixKey(initialValue?.pixKey ?? '')
    setBaseSalary(initialValue ? String(initialValue.baseSalary) : '')
    setType(initialValue?.type ?? 'MONTHLY')
    setStatus(initialValue?.status ?? 'ACTIVE')
    setHireDate(toDateInputValue(initialValue?.hireDate) || toDateInputValue(new Date()))
    setNotes(initialValue?.notes ?? '')
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedRole = role.trim()
    const trimmedPixKey = pixKey.trim()
    const trimmedNotes = notes.trim()
    const documentDigits = onlyDigits(document)
    const phoneDigits = onlyDigits(phone)
    const parsedBaseSalary = Number(baseSalary)

    if (trimmedName.length < 2) {
      setError('Nome deve ter ao menos 2 caracteres.')
      return
    }
    if (trimmedRole.length < 2) {
      setError('Cargo deve ter ao menos 2 caracteres.')
      return
    }
    if (!Number.isFinite(parsedBaseSalary) || parsedBaseSalary <= 0) {
      setError('Salário base deve ser maior que zero.')
      return
    }
    if (!type) {
      setError('Selecione o tipo de vínculo.')
      return
    }
    if (!hireDate) {
      setError('Informe a data de admissão.')
      return
    }
    if (documentDigits && documentDigits.length !== 11) {
      setError('CPF deve ter 11 dígitos.')
      return
    }

    if (!initialValue) {
      setError(null)
      onSubmit({
        name: trimmedName,
        role: trimmedRole,
        baseSalary: parsedBaseSalary,
        type,
        hireDate: dateInputToIso(hireDate)!,
        ...(status !== 'ACTIVE' ? { status } : {}),
        ...(documentDigits ? { document: documentDigits } : {}),
        ...(phoneDigits ? { phone: phoneDigits } : {}),
        ...(trimmedPixKey ? { pixKey: trimmedPixKey } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      })
      return
    }

    const payload: EmployeePayload = {}

    if (trimmedName !== initialValue.name) payload.name = trimmedName
    if (trimmedRole !== initialValue.role) payload.role = trimmedRole
    if (parsedBaseSalary !== Number(initialValue.baseSalary)) payload.baseSalary = parsedBaseSalary
    if (type !== initialValue.type) payload.type = type
    if (status !== initialValue.status) payload.status = status
    if (hireDate !== toDateInputValue(initialValue.hireDate)) payload.hireDate = dateInputToIso(hireDate)!
    if (documentDigits !== (initialValue.document ?? '')) payload.document = documentDigits || null
    if (phoneDigits !== (initialValue.phone ?? '')) payload.phone = phoneDigits || null
    if (trimmedPixKey !== (initialValue.pixKey ?? '')) payload.pixKey = trimmedPixKey || null
    if (trimmedNotes !== (initialValue.notes ?? '')) payload.notes = trimmedNotes || null

    if (Object.keys(payload).length === 0) {
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
          <Label htmlFor="employee-name">Nome</Label>
          <Input id="employee-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-role">Cargo</Label>
          <Input id="employee-role" value={role} onChange={(event) => setRole(event.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employee-type">Tipo</Label>
          <Select id="employee-type" value={type} onChange={(event) => setType(event.target.value as EmployeeType)}>
            <option value="MONTHLY">{formatEmployeeType('MONTHLY')}</option>
            <option value="DAILY">{formatEmployeeType('DAILY')}</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-status">Status</Label>
          <Select id="employee-status" value={status} onChange={(event) => setStatus(event.target.value as EmployeeStatus)}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-hire-date">Admissão</Label>
          <Input
            id="employee-hire-date"
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employee-base-salary">Salário base</Label>
          <Input
            id="employee-base-salary"
            type="number"
            min="0.01"
            step="0.01"
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
            {formatCurrency(Number(baseSalary) || 0)}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-document">CPF</Label>
          <Input id="employee-document" value={document} onChange={(event) => setDocument(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee-phone">Telefone</Label>
          <Input id="employee-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-pix-key">Chave Pix</Label>
          <Input id="employee-pix-key" value={pixKey} onChange={(event) => setPixKey(event.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employee-notes">Observações</Label>
        <Textarea id="employee-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {initialValue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Funcionários inativos não aparecem no select de pagamentos.
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
