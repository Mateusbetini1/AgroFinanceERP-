import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Safra, SafraStatus } from '@/types/api'

export interface SafraPayload {
  productId?: string
  farmLocationId?: string | null
  name?: string
  startDate?: string
  endDate?: string | null
  estimatedYield?: number | null
  status?: SafraStatus
  notes?: string | null
  active?: boolean
}

function cleanCreateSafraPayload(payload: SafraPayload): SafraPayload {
  const clean: SafraPayload = {
    productId: payload.productId,
    name: payload.name?.trim(),
    startDate: payload.startDate,
    status: payload.status ?? 'PLANNED',
  }

  if (payload.farmLocationId) clean.farmLocationId = payload.farmLocationId
  if (payload.endDate) clean.endDate = payload.endDate
  if (payload.estimatedYield !== undefined && payload.estimatedYield !== null) clean.estimatedYield = payload.estimatedYield
  if (payload.notes) clean.notes = payload.notes.trim()

  return clean
}

function cleanUpdateSafraPayload(payload: SafraPayload): SafraPayload {
  const clean: SafraPayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof SafraPayload, SafraPayload[keyof SafraPayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'farmLocationId' || key === 'endDate' || key === 'estimatedYield' || key === 'notes') {
        clean[key] = value
      }
      continue
    }

    if (key === 'name') {
      clean.name = String(value).trim()
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listSafras() {
  const { data } = await api.get<PaginatedResponse<Safra>>('/safras')
  return data
}

export async function getSafra(id: string) {
  const { data } = await api.get<ApiResponse<Safra>>(`/safras/${id}`)
  return data.data
}

export async function createSafra(payload: SafraPayload) {
  const { data } = await api.post<ApiResponse<Safra>>('/safras', cleanCreateSafraPayload(payload))
  return data.data
}

export async function updateSafra(id: string, payload: SafraPayload) {
  const { data } = await api.patch<ApiResponse<Safra>>(`/safras/${id}`, cleanUpdateSafraPayload(payload))
  return data.data
}

export async function deleteSafra(id: string) {
  await api.delete(`/safras/${id}`)
}
