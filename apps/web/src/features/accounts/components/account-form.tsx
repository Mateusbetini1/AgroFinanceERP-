'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { Account, AccountType } from '@/types/api'
import type { AccountPayload } from '../api'

interface AccountFormProps {
  initialValue?: Account | null
  isSubmitting?: boolean
  onSubmit: (payload: AccountPayload) => void
  onCancel: () => void
}

export function AccountForm({ initialValue, isSubmitting, onSubmit, onCancel }: AccountFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('CASH')
  const [bankName, setBankName] = useState('')
  const [agency, setAgency] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [initialBalance, setInitialBalance] = useState('0')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialValue?.name ?? '')
    setType(initialValue?.type ?? 'CASH')
    setBankName(initialValue?.bankName ?? '')
    setAgency(initialValue?.agency ?? '')
    setAccountNumber(initialValue?.accountNumber ?? '')
    setInitialBalance(initialValue ? String(initialValue.initialBalance) : '0')
    setActive(initialValue?.active ?? true)
    setError(null)
  }, [initialValue])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setError('Informe o nome da conta com pelo menos 2 caracteres.')
      return
    }

    const payload: AccountPayload = {
      name: name.trim(),
      type,
      bankName: bankName.trim() ? bankName.trim() : null,
      agency: agency.trim() ? agency.trim() : null,
      accountNumber: accountNumber.trim() ? accountNumber.trim() : null,
      ...(initialValue ? { active } : { initialBalance: Number(initialBalance || 0) }),
    }

    if (
      initialValue &&
      payload.name === initialValue.name &&
      payload.type === initialValue.type &&
      payload.bankName === (initialValue.bankName ?? null) &&
      payload.agency === (initialValue.agency ?? null) &&
      payload.accountNumber === (initialValue.accountNumber ?? null) &&
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-name">Nome</Label>
          <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-type">Tipo</Label>
          <Select id="account-type" value={type} onChange={(event) => setType(event.target.value as AccountType)}>
            <option value="CASH">Caixa</option>
            <option value="BANK">Banco</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="account-bank">Banco</Label>
          <Input id="account-bank" value={bankName} onChange={(event) => setBankName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-agency">Agência</Label>
          <Input id="account-agency" value={agency} onChange={(event) => setAgency(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-number">Número</Label>
          <Input id="account-number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
        </div>
      </div>

      {!initialValue && (
        <div className="space-y-2">
          <Label htmlFor="account-initial">Saldo inicial</Label>
          <Input
            id="account-initial"
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(event) => setInitialBalance(event.target.value)}
          />
        </div>
      )}

      {initialValue && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />
          Conta ativa
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
