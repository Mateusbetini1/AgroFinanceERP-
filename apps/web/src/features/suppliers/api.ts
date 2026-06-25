import { api } from '@/lib/api'
import type { PaginatedResponse, Supplier } from '@/types/api'

export async function listSuppliers() {
  const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers')
  return data
}
