import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { DashboardMonthly, DashboardOverview } from './types'

export async function getDashboardOverview() {
  const { data } = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview')
  return data.data
}

export async function getDashboardMonthly(month: number, year: number) {
  const { data } = await api.get<ApiResponse<DashboardMonthly>>('/dashboard/monthly', {
    params: { month, year },
  })
  return data.data
}
