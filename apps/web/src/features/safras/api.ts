import { api } from '@/lib/api'
import type { PaginatedResponse, Safra } from '@/types/api'

export async function listSafras() {
  const { data } = await api.get<PaginatedResponse<Safra>>('/safras')
  return data
}
