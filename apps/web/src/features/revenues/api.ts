import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Revenue, RevenueStatus } from '@/types/api'

export interface RevenuePayload {
  productId?: string
  accountId?: string | null
  safraId?: string | null
  date?: string
  receivedAt?: string | null
  quantity?: number
  unitPrice?: number
  client?: string | null
  notes?: string | null
  status?: RevenueStatus
}

function cleanCreateRevenuePayload(payload: RevenuePayload): RevenuePayload {
  const clean: RevenuePayload = {
    productId: payload.productId,
    date: payload.date,
    quantity: payload.quantity,
    unitPrice: payload.unitPrice,
    status: payload.status,
  }

  if (payload.status === 'RECEIVED' && payload.accountId) clean.accountId = payload.accountId
  if (payload.safraId) clean.safraId = payload.safraId
  if (payload.receivedAt) clean.receivedAt = payload.receivedAt
  if (payload.client) clean.client = payload.client
  if (payload.notes) clean.notes = payload.notes

  return clean
}

function cleanUpdateRevenuePayload(payload: RevenuePayload): RevenuePayload {
  const clean: RevenuePayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof RevenuePayload, RevenuePayload[keyof RevenuePayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'accountId' || key === 'safraId' || key === 'receivedAt' || key === 'client' || key === 'notes') {
        clean[key] = value
      }
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listRevenues() {
  const { data } = await api.get<PaginatedResponse<Revenue>>('/revenues')
  return data
}

export async function createRevenue(payload: RevenuePayload) {
  const { data } = await api.post<ApiResponse<Revenue>>('/revenues', cleanCreateRevenuePayload(payload))
  return data.data
}

export async function updateRevenue(id: string, payload: RevenuePayload) {
  const { data } = await api.patch<ApiResponse<Revenue>>(`/revenues/${id}`, cleanUpdateRevenuePayload(payload))
  return data.data
}

export async function deleteRevenue(id: string) {
  await api.delete(`/revenues/${id}`)
}
