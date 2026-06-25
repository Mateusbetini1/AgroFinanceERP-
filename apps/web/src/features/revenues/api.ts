import { api } from '@/lib/api'
import type { PaginatedResponse, Revenue } from '@/types/api'

export async function listRevenues() {
  const { data } = await api.get<PaginatedResponse<Revenue>>('/revenues')
  return data
}
