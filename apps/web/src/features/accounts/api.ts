import { api } from '@/lib/api'
import type { Account, PaginatedResponse } from '@/types/api'

export async function listAccounts() {
  const { data } = await api.get<PaginatedResponse<Account>>('/accounts')
  return data
}
