import { api } from '@/lib/api'
import type { Bill, PaginatedResponse } from '@/types/api'

export async function listBills() {
  const { data } = await api.get<PaginatedResponse<Bill>>('/bills')
  return data
}
