'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { onlyDigits } from '@/lib/utils'
import type { Supplier } from '@/types/api'
import type { SupplierPayload } from '../api'

interface SupplierFormProps {
  initialValue?: Supplier | null
  isSubmitting?: boolean
  onSubmit: (payload: SupplierPayload) => void
  onCancel: () => void
}

export function SupplierForm({ initialValue, isSubmitting, onSubmit, onCancel }: SupplierFormProps) {
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setDocument(initialValue?.document ?? '')
    setEmail(initialValue?.email ?? '')
    setPhone(initialValue?.phone ?? '')
    setContactName(initialValue?.contactName ?? '')
    setNotes(initialValue?.notes ?? '')
  }, [initialValue])

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name,
          document: onlyDigits(document),
          email: email.trim() ? email : null,
          phone: phone.trim() ? onlyDigits(phone) : null,
          contactName: contactName.trim() ? contactName : null,
          notes: notes.trim() ? notes : null,
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier-name">Nome</Label>
          <Input id="supplier-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-document">CPF/CNPJ</Label>
          <Input id="supplier-document" value={document} onChange={(event) => setDocument(event.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier-phone">Telefone</Label>
          <Input id="supplier-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-email">Email</Label>
          <Input id="supplier-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier-contact">Contato</Label>
        <Input id="supplier-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier-notes">Observações</Label>
        <Textarea id="supplier-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

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
