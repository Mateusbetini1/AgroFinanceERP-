import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { SafraReportDetail, SafraReportFilters, SafraReportSummary } from './types'

interface SafraReportListResponse {
  success: boolean
  count: number
  data: SafraReportSummary[]
}

function cleanFilters(filters: SafraReportFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function listSafraReports(filters: SafraReportFilters = {}) {
  const { data } = await api.get<SafraReportListResponse>('/reports/safras', {
    params: cleanFilters(filters),
  })
  return data
}

export async function getSafraReportDetail(id: string) {
  const { data } = await api.get<ApiResponse<SafraReportDetail>>(`/reports/safras/${id}`)
  return data.data
}
