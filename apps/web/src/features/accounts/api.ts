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

export async function listAccounts() {
  const { data } = await api.get<PaginatedResponse<Account>>('/accounts')
  return data
}

export async function createAccount(payload: AccountPayload) {
  const { data } = await api.post<ApiResponse<Account>>('/accounts', payload)
  return data.data
}

export async function updateAccount(id: string, payload: Omit<AccountPayload, 'initialBalance'>) {
  const { data } = await api.patch<ApiResponse<Account>>(`/accounts/${id}`, payload)
  return data.data
}

export async function deleteAccount(id: string) {
  await api.delete(`/accounts/${id}`)
}
