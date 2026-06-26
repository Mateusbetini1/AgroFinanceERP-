import { api } from '@/lib/api'
import type { Account, AccountType, ApiResponse, PaginatedResponse } from '@/types/api'

export interface AccountPayload {
  name: string
  type: AccountType
  bankName?: string | null
  agency?: string | null
  accountNumber?: string | null
  initialBalance?: number
  active?: boolean
}

function cleanCreateAccountPayload(payload: AccountPayload): AccountPayload {
  const clean: AccountPayload = {
    name: payload.name,
    type: payload.type,
  }

  if (payload.bankName) clean.bankName = payload.bankName
  if (payload.agency) clean.agency = payload.agency
  if (payload.accountNumber) clean.accountNumber = payload.accountNumber
  if (payload.initialBalance !== undefined) clean.initialBalance = payload.initialBalance

  return clean
}

function cleanUpdateAccountPayload(payload: Omit<AccountPayload, 'initialBalance'>): Omit<AccountPayload, 'initialBalance'> {
  const clean: Omit<AccountPayload, 'initialBalance'> = {
    name: payload.name,
    type: payload.type,
  }

  if (payload.bankName !== undefined) clean.bankName = payload.bankName
  if (payload.agency !== undefined) clean.agency = payload.agency
  if (payload.accountNumber !== undefined) clean.accountNumber = payload.accountNumber
  if (payload.active !== undefined) clean.active = payload.active

  return clean
}

export async function listAccounts() {
  const { data } = await api.get<PaginatedResponse<Account>>('/accounts')
  return data
}

export async function createAccount(payload: AccountPayload) {
  const { data } = await api.post<ApiResponse<Account>>('/accounts', cleanCreateAccountPayload(payload))
  return data.data
}

export async function updateAccount(id: string, payload: Omit<AccountPayload, 'initialBalance'>) {
  const { data } = await api.patch<ApiResponse<Account>>(`/accounts/${id}`, cleanUpdateAccountPayload(payload))
  return data.data
}

export async function deleteAccount(id: string) {
  await api.delete(`/accounts/${id}`)
}
