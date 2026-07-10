import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Supply, SupplyCategory, SupplyUnit } from '@/types/api'

export interface SupplyPayload {
  name: string
  category: SupplyCategory
  baseUnit: SupplyUnit
  purchaseUnitDefault: SupplyUnit
  packageSizeBaseQuantity?: number | null
  packageSizeUnit?: SupplyUnit | null
  active?: boolean
  notes?: string | null
}

function cleanSupplyPayload(payload: SupplyPayload): SupplyPayload {
  return {
    name: payload.name,
    category: payload.category,
    baseUnit: payload.baseUnit,
    purchaseUnitDefault: payload.purchaseUnitDefault,
    packageSizeBaseQuantity: payload.packageSizeBaseQuantity ?? null,
    packageSizeUnit: payload.packageSizeUnit ?? null,
    active: payload.active,
    notes: payload.notes ?? null,
  }
}

export async function listSupplies() {
  const { data } = await api.get<PaginatedResponse<Supply>>('/supplies')
  return data
}

export async function createSupply(payload: SupplyPayload) {
  const { data } = await api.post<ApiResponse<Supply>>('/supplies', cleanSupplyPayload(payload))
  return data.data
}

export async function updateSupply(id: string, payload: SupplyPayload) {
  const { data } = await api.patch<ApiResponse<Supply>>(`/supplies/${id}`, cleanSupplyPayload(payload))
  return data.data
}

export async function deleteSupply(id: string) {
  await api.delete(`/supplies/${id}`)
}
