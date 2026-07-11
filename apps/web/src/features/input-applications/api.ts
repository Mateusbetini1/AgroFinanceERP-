import { api } from '@/lib/api'
import type { ApiResponse, InputApplication, PaginatedResponse, SupplyUnit } from '@/types/api'

export interface InputApplicationPayload {
  supplyId: string
  applicationDate: string
  quantity: number
  unit: SupplyUnit
  safraId: string
  farmLocationId?: string | null
  notes?: string | null
}

function cleanInputApplicationPayload(payload: InputApplicationPayload): InputApplicationPayload {
  return {
    supplyId: payload.supplyId,
    applicationDate: payload.applicationDate,
    quantity: Number(payload.quantity),
    unit: payload.unit,
    safraId: payload.safraId,
    farmLocationId: payload.farmLocationId || null,
    notes: payload.notes?.trim() || null,
  }
}

export async function listInputApplications() {
  const { data } = await api.get<PaginatedResponse<InputApplication>>('/input-applications')
  return data
}

export async function createInputApplication(payload: InputApplicationPayload) {
  const { data } = await api.post<ApiResponse<InputApplication>>(
    '/input-applications',
    cleanInputApplicationPayload(payload),
  )
  return data.data
}
