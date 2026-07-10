import { api } from '@/lib/api'
import type { InputStockBalance, InputStockMovement, PaginatedResponse } from '@/types/api'

export async function listInputStock() {
  const { data } = await api.get<PaginatedResponse<InputStockBalance>>('/input-stock')
  return data
}

export async function listInputStockMovements() {
  const { data } = await api.get<PaginatedResponse<InputStockMovement>>('/input-stock/movements')
  return data
}
