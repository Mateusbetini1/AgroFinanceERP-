import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { DashboardOverview } from './types'

export async function getDashboardOverview() {
  const { data } = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview')
  return data.data
}
