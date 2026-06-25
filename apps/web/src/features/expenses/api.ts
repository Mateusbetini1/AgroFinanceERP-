import { api } from '@/lib/api'
import type { Expense, PaginatedResponse } from '@/types/api'

export async function listExpenses() {
  const { data } = await api.get<PaginatedResponse<Expense>>('/expenses')
  return data
}
