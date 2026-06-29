import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { CashflowForecast } from './types'

export async function getCashflowForecast(months = 12) {
  const { data } = await api.get<ApiResponse<CashflowForecast>>('/dashboard/forecast', {
    params: { months },
  })
  return data.data
}
