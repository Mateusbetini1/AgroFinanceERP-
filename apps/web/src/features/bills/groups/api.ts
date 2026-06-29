import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { BillGroupDetail, BillGroupFilters, BillGroupSummary } from './types'

function cleanFilters(filters: BillGroupFilters = {}) {
  const params: Record<string, string | number> = {}

  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.supplierId) params.supplierId = filters.supplierId
  if (filters.status) params.status = filters.status

  return params
}

export async function listBillGroups(filters?: BillGroupFilters) {
  const { data } = await api.get<PaginatedResponse<BillGroupSummary>>('/bills/groups', {
    params: cleanFilters(filters),
  })
  return data
}

export async function getBillGroup(id: string) {
  const { data } = await api.get<ApiResponse<BillGroupDetail>>(`/bills/groups/${id}`)
  return data.data!
}
