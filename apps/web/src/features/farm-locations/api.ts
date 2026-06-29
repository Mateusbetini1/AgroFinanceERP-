import { api } from '@/lib/api'
import type { ApiResponse, FarmLocation, FarmLocationType, PaginatedResponse } from '@/types/api'

export interface FarmLocationListParams {
  page?: number
  limit?: number
  search?: string
  type?: FarmLocationType
  active?: boolean
}

export interface FarmLocationPayload {
  name?: string
  type?: FarmLocationType
  area?: number | null
  notes?: string | null
  active?: boolean
}

function cleanCreateFarmLocationPayload(payload: FarmLocationPayload): FarmLocationPayload {
  const clean: FarmLocationPayload = {
    name: payload.name?.trim(),
    type: payload.type,
  }

  if (payload.area !== undefined && payload.area !== null) clean.area = payload.area
  if (payload.notes) clean.notes = payload.notes.trim()

  return clean
}

function cleanUpdateFarmLocationPayload(payload: FarmLocationPayload): FarmLocationPayload {
  const clean: FarmLocationPayload = {}

  for (const [key, value] of Object.entries(payload) as Array<
    [keyof FarmLocationPayload, FarmLocationPayload[keyof FarmLocationPayload]]
  >) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'area' || key === 'notes') clean[key] = value
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

export async function listFarmLocations(params: FarmLocationListParams = {}) {
  const cleanParams = {
    ...params,
    search: params.search?.trim() || undefined,
    active: params.active === undefined ? undefined : String(params.active),
  }

  const { data } = await api.get<PaginatedResponse<FarmLocation>>('/farm-locations', {
    params: cleanParams,
  })
  return data
}

export async function getFarmLocation(id: string) {
  const { data } = await api.get<ApiResponse<FarmLocation>>(`/farm-locations/${id}`)
  return data.data
}

export async function createFarmLocation(payload: FarmLocationPayload) {
  const { data } = await api.post<ApiResponse<FarmLocation>>(
    '/farm-locations',
    cleanCreateFarmLocationPayload(payload),
  )
  return data.data
}

export async function updateFarmLocation(id: string, payload: FarmLocationPayload) {
  const { data } = await api.patch<ApiResponse<FarmLocation>>(
    `/farm-locations/${id}`,
    cleanUpdateFarmLocationPayload(payload),
  )
  return data.data
}

export async function deleteFarmLocation(id: string) {
  await api.delete(`/farm-locations/${id}`)
}
