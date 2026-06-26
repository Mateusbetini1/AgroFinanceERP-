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

function cleanCreateSupplierPayload(payload: SupplierPayload): SupplierPayload {
  const clean: SupplierPayload = {
    name: payload.name,
    document: payload.document,
  }

  if (payload.email) clean.email = payload.email
  if (payload.phone) clean.phone = payload.phone
  if (payload.contactName) clean.contactName = payload.contactName
  if (payload.notes) clean.notes = payload.notes

  return clean
}

function cleanUpdateSupplierPayload(payload: SupplierPayload): SupplierPayload {
  const clean: SupplierPayload = {
    name: payload.name,
    document: payload.document,
  }

  if (payload.email !== undefined) clean.email = payload.email
  if (payload.phone !== undefined) clean.phone = payload.phone
  if (payload.contactName !== undefined) clean.contactName = payload.contactName
  if (payload.notes !== undefined) clean.notes = payload.notes

  return clean
}

export async function listSuppliers() {
  const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers')
  return data
}

export async function createSupplier(payload: SupplierPayload) {
  const { data } = await api.post<ApiResponse<Supplier>>('/suppliers', cleanCreateSupplierPayload(payload))
  return data.data
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  const { data } = await api.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, cleanUpdateSupplierPayload(payload))
  return data.data
}

export async function deleteSupplier(id: string) {
  await api.delete(`/suppliers/${id}`)
}
