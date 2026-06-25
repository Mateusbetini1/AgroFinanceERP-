import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Supplier } from '@/types/api'

export interface SupplierPayload {
  name: string
  document: string
  email?: string | null
  phone?: string | null
  contactName?: string | null
  notes?: string | null
}

export async function listSuppliers() {
  const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers')
  return data
}

export async function createSupplier(payload: SupplierPayload) {
  const { data } = await api.post<ApiResponse<Supplier>>('/suppliers', payload)
  return data.data
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  const { data } = await api.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, payload)
  return data.data
}

export async function deleteSupplier(id: string) {
  await api.delete(`/suppliers/${id}`)
}
